import type {
    ChatEvent,
    ChatSummary,
    EventsResponse,
    EventsSuccessResult,
    EventWrapper,
    Message,
    SendMessageSuccess,
    TransferSuccess,
} from "../../domain/chat/chat";
import { missingUserIds } from "../../domain/user/user.utils";
import { rtcConnectionsManager } from "../../domain/webrtc/RtcConnectionsManager";
import type { ServiceContainer } from "../../services/serviceContainer";
import DRange from "drange";
import {
    currentChatDraftMessage,
    updateSummaryWithConfirmedMessage,
    chatStateStore,
    addServerEventsToStores,
    confirmedEventIndexesLoaded,
    clearServerEvents,
} from "../../stores/chat";
import { userStore } from "../../stores/user";
import { toastStore } from "../../stores/toast";
import { localMessageUpdates } from "../../stores/localMessageUpdates";
import {
    indexRangeForChat,
    makeRtcConnections,
    mergeSendMessageResponse,
    serialiseMessageForRtc,
    upToDate,
    userIdsFromEvents,
} from "../../domain/chat/chat.utils";
import type { CreatedUser, User } from "../../domain/user/user";
import { get } from "svelte/store";
import { findLast } from "../../utils/list";
import { indexIsInRanges } from "../../utils/range";
import { unconfirmed } from "../../stores/unconfirmed";
import { messagesRead } from "../../stores/markRead";
import { trackEvent } from "../../utils/tracking";

export function selectReaction(
    api: ServiceContainer,
    chat: ChatSummary,
    userId: string,
    threadRootMessageIndex: number | undefined,
    messageId: bigint,
    reaction: string,
    username: string,
    kind: "add" | "remove"
): Promise<boolean> {
    localMessageUpdates.markReaction(messageId.toString(), {
        reaction,
        kind,
        userId,
    });

    function undoLocally() {
        localMessageUpdates.markReaction(messageId.toString(), {
            reaction,
            kind: kind === "add" ? "remove" : "add",
            userId,
        });
    }

    return (
        chat.kind === "direct_chat"
            ? kind == "add"
                ? api.addDirectChatReaction(
                      chat.chatId,
                      messageId,
                      reaction,
                      username,
                      threadRootMessageIndex
                  )
                : api.removeDirectChatReaction(
                      chat.chatId,
                      messageId,
                      reaction,
                      threadRootMessageIndex
                  )
            : kind === "add"
            ? api.addGroupChatReaction(
                  chat.chatId,
                  messageId,
                  reaction,
                  username,
                  threadRootMessageIndex
              )
            : api.removeGroupChatReaction(chat.chatId, messageId, reaction, threadRootMessageIndex)
    )
        .then((resp) => {
            if (resp !== "success" && resp !== "no_change") {
                undoLocally();
                return false;
            }
            return true;
        })
        .catch((_) => {
            undoLocally();
            return false;
        });
}

export function deleteMessage(
    api: ServiceContainer,
    userId: string,
    chat: ChatSummary,
    threadRootMessageIndex: number | undefined,
    messageId: bigint
): Promise<boolean> {
    const messageIdString = messageId.toString();

    localMessageUpdates.markDeleted(messageIdString, userId);

    const recipients = [...chatStateStore.getProp(chat.chatId, "userIds")];
    const chatType = chat.kind;
    const chatId = chat.chatId;

    rtcConnectionsManager.sendMessage(recipients, {
        kind: "remote_user_deleted_message",
        chatType,
        chatId,
        messageId,
        userId,
        threadRootMessageIndex,
    });

    function undelete() {
        rtcConnectionsManager.sendMessage(recipients, {
            kind: "remote_user_undeleted_message",
            chatType,
            chatId,
            messageId,
            userId,
            threadRootMessageIndex,
        });
        localMessageUpdates.markUndeleted(messageIdString);
    }

    return api
        .deleteMessage(chat, messageId, threadRootMessageIndex)
        .then((resp) => {
            const success = resp === "success";
            if (!success) {
                undelete();
            }
            return success;
        })
        .catch((_) => {
            undelete();
            return false;
        });
}

export async function updateUserStore(
    api: ServiceContainer,
    chatId: string,
    userId: string,
    userIdsFromEvents: Set<string>
): Promise<void> {
    const allUserIds = new Set<string>();
    chatStateStore.getProp(chatId, "members").forEach((m) => allUserIds.add(m.userId));
    chatStateStore.getProp(chatId, "blockedUsers").forEach((u) => allUserIds.add(u));
    userIdsFromEvents.forEach((u) => allUserIds.add(u));

    chatStateStore.updateProp(chatId, "userIds", (userIds) => {
        allUserIds.forEach((u) => {
            if (u !== userId) {
                userIds.add(u);
            }
        });
        return userIds;
    });

    const resp = await api.getUsers(
        {
            userGroups: [
                {
                    users: missingUserIds(get(userStore), new Set<string>(allUserIds)),
                    updatedSince: BigInt(0),
                },
            ],
        },
        true
    );

    userStore.addMany(resp.users);
}

export function editMessage(
    api: ServiceContainer,
    chat: ChatSummary,
    msg: Message,
    threadRootMessageIndex: number | undefined
): Promise<void> {
    localMessageUpdates.markContentEdited(msg.messageId.toString(), msg.content);

    if (threadRootMessageIndex === undefined) {
        currentChatDraftMessage.clear(chat.chatId);
    }

    return api
        .editMessage(chat, msg, threadRootMessageIndex)
        .then((resp) => {
            if (resp !== "success") {
                toastStore.showFailureToast("errorEditingMessage");
                localMessageUpdates.revertEditedContent(msg.messageId.toString());
            }
        })
        .catch((err) => {
            api.logError("Exception sending message", err);
            toastStore.showFailureToast("errorEditingMessage");
            localMessageUpdates.revertEditedContent(msg.messageId.toString());
        });
}

export function registerPollVote(
    api: ServiceContainer,
    userId: string,
    chatId: string,
    threadRootMessageIndex: number | undefined,
    messageId: bigint,
    messageIndex: number,
    answerIndex: number,
    type: "register" | "delete"
): void {
    localMessageUpdates.markPollVote(messageId.toString(), {
        answerIndex,
        type,
        userId,
    });

    api.registerPollVote(chatId, messageIndex, answerIndex, type, threadRootMessageIndex)
        .then((resp) => {
            if (resp !== "success") {
                toastStore.showFailureToast("poll.voteFailed");
                api.logError("Poll vote failed: ", resp);
                console.log("poll vote failed: ", resp);
            }
        })
        .catch((err) => {
            toastStore.showFailureToast("poll.voteFailed");
            api.logError("Poll vote failed: ", err);
            console.log("poll vote failed: ", err);
        });
}

function blockUserLocally(chatId: string, userId: string): void {
    chatStateStore.updateProp(chatId, "blockedUsers", (b) => b.add(userId));
    chatStateStore.updateProp(chatId, "members", (p) => p.filter((p) => p.userId !== userId));
}

function unblockUserLocally(chatId: string, userId: string): void {
    chatStateStore.updateProp(chatId, "blockedUsers", (b) => {
        b.delete(userId);
        return b;
    });
    chatStateStore.updateProp(chatId, "members", (p) => [
        ...p,
        {
            role: "participant",
            userId,
            username: get(userStore)[userId]?.username ?? "unknown",
        },
    ]);
}

export function blockUser(api: ServiceContainer, chatId: string, userId: string): Promise<void> {
    blockUserLocally(chatId, userId);
    return api
        .blockUserFromGroupChat(chatId, userId)
        .then((resp) => {
            if (resp === "success") {
                toastStore.showSuccessToast("blockUserSucceeded");
            } else {
                toastStore.showFailureToast("blockUserFailed");
                unblockUserLocally(chatId, userId);
            }
        })
        .catch((err) => {
            toastStore.showFailureToast("blockUserFailed");
            api.logError("Error blocking user", err);
            unblockUserLocally(chatId, userId);
        });
}

export async function loadEventWindow(
    api: ServiceContainer,
    user: CreatedUser,
    serverChat: ChatSummary,
    chat: ChatSummary,
    messageIndex: number
): Promise<number | undefined> {
    if (messageIndex >= 0) {
        const range = indexRangeForChat(serverChat);
        const eventsPromise: Promise<EventsResponse<ChatEvent>> =
            chat.kind === "direct_chat"
                ? api.directChatEventsWindow(range, chat.them, messageIndex, chat.latestEventIndex)
                : api.groupChatEventsWindow(
                      range,
                      chat.chatId,
                      messageIndex,
                      chat.latestEventIndex
                  );
        const eventsResponse = await eventsPromise;

        if (eventsResponse === undefined || eventsResponse === "events_failed") {
            return undefined;
        }

        await handleEventsResponse(api, user, chat, eventsResponse, false);

        return messageIndex;
    }
}

export async function handleEventsResponse(
    api: ServiceContainer,
    user: CreatedUser,
    chat: ChatSummary,
    resp: EventsResponse<ChatEvent>,
    keepCurrentEvents = true
): Promise<void> {
    if (resp === "events_failed") return;

    if (!keepCurrentEvents) {
        clearServerEvents(chat.chatId);
        chatStateStore.setProp(chat.chatId, "userGroupKeys", new Set<string>());
    } else if (!isContiguous(chat.chatId, resp)) {
        return;
    }

    // Only include affected events that overlap with already loaded events
    const confirmedLoaded = confirmedEventIndexesLoaded(chat.chatId);
    const events = resp.events.concat(
        resp.affectedEvents.filter((e) => indexIsInRanges(e.index, confirmedLoaded))
    );

    const userIds = userIdsFromEvents(events);
    await updateUserStore(api, chat.chatId, user.userId, userIds);

    addServerEventsToStores(chat.chatId, events, undefined);

    makeRtcConnections(user.userId, chat, events, get(userStore));
}

function isContiguous(chatId: string, response: EventsSuccessResult<ChatEvent>): boolean {
    const confirmedLoaded = confirmedEventIndexesLoaded(chatId);

    if (confirmedLoaded.length === 0 || response.events.length === 0) return true;

    const firstIndex = response.events[0].index;
    const lastIndex = response.events[response.events.length - 1].index;
    const contiguousCheck = new DRange(firstIndex - 1, lastIndex + 1);

    const isContiguous = confirmedLoaded.clone().intersect(contiguousCheck).length > 0;

    if (!isContiguous) {
        console.log(
            "Events in response are not contiguous with the loaded events",
            confirmedLoaded,
            firstIndex,
            lastIndex
        );
    }

    return isContiguous;
}

function loadEvents(
    api: ServiceContainer,
    serverChat: ChatSummary,
    clientChat: ChatSummary,
    startIndex: number,
    ascending: boolean
): Promise<EventsResponse<ChatEvent>> {
    return api.chatEvents(
        clientChat,
        indexRangeForChat(serverChat),
        startIndex,
        ascending,
        undefined,
        clientChat.latestEventIndex
    );
}

export async function loadPreviousMessages(
    api: ServiceContainer,
    user: CreatedUser,
    serverChat: ChatSummary,
    clientChat: ChatSummary
): Promise<void> {
    const criteria = previousMessagesCriteria(serverChat, clientChat);

    const eventsResponse = criteria
        ? await loadEvents(api, serverChat, clientChat, criteria[0], criteria[1])
        : undefined;

    if (eventsResponse === undefined || eventsResponse === "events_failed") {
        return;
    }

    await handleEventsResponse(api, user, clientChat, eventsResponse);
    return;
}

function earliestAvailableEventIndex(clientChat: ChatSummary): number {
    return clientChat.kind === "group_chat" ? clientChat.minVisibleEventIndex : 0;
}

function previousMessagesCriteria(
    serverChat: ChatSummary,
    clientChat: ChatSummary
): [number, boolean] | undefined {
    if (serverChat.latestEventIndex < 0) {
        return undefined;
    }

    const minLoadedEventIndex = earliestLoadedIndex(serverChat.chatId);
    if (minLoadedEventIndex === undefined) {
        return [serverChat.latestEventIndex, false];
    }
    const minVisibleEventIndex = earliestAvailableEventIndex(clientChat);
    return minLoadedEventIndex !== undefined && minLoadedEventIndex > minVisibleEventIndex
        ? [minLoadedEventIndex - 1, false]
        : undefined;
}

function earliestLoadedIndex(chatId: string): number | undefined {
    const confirmedLoaded = confirmedEventIndexesLoaded(chatId);
    return confirmedLoaded.length > 0 ? confirmedLoaded.index(0) : undefined;
}

export async function loadNewMessages(
    api: ServiceContainer,
    user: CreatedUser,
    serverChat: ChatSummary,
    clientChat: ChatSummary
): Promise<boolean> {
    const criteria = newMessageCriteria(serverChat);

    const eventsResponse = criteria
        ? await loadEvents(api, serverChat, clientChat, criteria[0], criteria[1])
        : undefined;

    if (eventsResponse === undefined || eventsResponse === "events_failed") {
        return false;
    }

    await handleEventsResponse(api, user, clientChat, eventsResponse);

    // We may have loaded messages which are more recent than what the chat summary thinks is the latest message,
    // if so, we update the chat summary to show the correct latest message.
    const latestMessage = findLast(eventsResponse.events, (e) => e.event.kind === "message");
    const newLatestMessage =
        latestMessage !== undefined && latestMessage.index > serverChat.latestEventIndex;

    if (newLatestMessage) {
        updateSummaryWithConfirmedMessage(
            clientChat.chatId,
            latestMessage as EventWrapper<Message>
        );
    }

    return newLatestMessage;
}

function newMessageCriteria(serverChat: ChatSummary): [number, boolean] | undefined {
    if (serverChat.latestEventIndex < 0) {
        return undefined;
    }

    const loadedUpTo = confirmedUpToEventIndex(serverChat.chatId);

    if (loadedUpTo === undefined) {
        return [serverChat.latestEventIndex, false];
    }

    return loadedUpTo < serverChat.latestEventIndex ? [loadedUpTo + 1, true] : undefined;
}

function confirmedUpToEventIndex(chatId: string): number | undefined {
    const ranges = confirmedEventIndexesLoaded(chatId).subranges();
    if (ranges.length > 0) {
        return ranges[0].high;
    }
    return undefined;
}

export function morePreviousMessagesAvailable(clientChat: ChatSummary): boolean {
    return (
        clientChat.latestEventIndex >= 0 &&
        (earliestLoadedIndex(clientChat.chatId) ?? Number.MAX_VALUE) >
            earliestAvailableEventIndex(clientChat)
    );
}

export function moreNewMessagesAvailable(serverChat: ChatSummary): boolean {
    return (confirmedUpToEventIndex(serverChat.chatId) ?? -1) < serverChat.latestEventIndex;
}

export function refreshAffectedEvents(
    api: ServiceContainer,
    user: CreatedUser,
    clientChat: ChatSummary,
    affectedEventIndexes: number[]
): Promise<void> {
    const confirmedLoaded = confirmedEventIndexesLoaded(clientChat.chatId);
    const filtered = affectedEventIndexes.filter((e) => indexIsInRanges(e, confirmedLoaded));
    if (filtered.length === 0) {
        return Promise.resolve();
    }

    const eventsPromise =
        clientChat.kind === "direct_chat"
            ? api.directChatEventsByEventIndex(
                  clientChat.them,
                  filtered,
                  undefined,
                  clientChat.latestEventIndex
              )
            : api.groupChatEventsByEventIndex(
                  clientChat.chatId,
                  filtered,
                  undefined,
                  clientChat.latestEventIndex
              );

    return eventsPromise.then((resp) => handleEventsResponse(api, user, clientChat, resp));
}

export async function loadDetails(
    api: ServiceContainer,
    user: CreatedUser,
    clientChat: ChatSummary,
    currentEvents: EventWrapper<ChatEvent>[]
): Promise<void> {
    // currently this is only meaningful for group chats, but we'll set it up generically just in case
    if (clientChat.kind === "group_chat") {
        if (!chatStateStore.getProp(clientChat.chatId, "detailsLoaded")) {
            const resp = await api.getGroupDetails(clientChat.chatId, clientChat.latestEventIndex);
            if (resp !== "caller_not_in_group") {
                chatStateStore.setProp(clientChat.chatId, "detailsLoaded", true);
                chatStateStore.setProp(
                    clientChat.chatId,
                    "latestEventIndex",
                    resp.latestEventIndex
                );
                chatStateStore.setProp(clientChat.chatId, "members", resp.members);
                chatStateStore.setProp(clientChat.chatId, "blockedUsers", resp.blockedUsers);
                chatStateStore.setProp(clientChat.chatId, "pinnedMessages", resp.pinnedMessages);
                chatStateStore.setProp(clientChat.chatId, "rules", resp.rules);
            }
            await updateUserStore(
                api,
                clientChat.chatId,
                user.userId,
                userIdsFromEvents(currentEvents)
            );
        } else {
            await updateDetails(api, user, clientChat, currentEvents);
        }
    }
}

export async function updateDetails(
    api: ServiceContainer,
    user: CreatedUser,
    clientChat: ChatSummary,
    currentEvents: EventWrapper<ChatEvent>[]
): Promise<void> {
    if (clientChat.kind === "group_chat") {
        const latestEventIndex = chatStateStore.getProp(clientChat.chatId, "latestEventIndex");
        if (latestEventIndex !== undefined && latestEventIndex < clientChat.latestEventIndex) {
            const gd = await api.getGroupDetailsUpdates(clientChat.chatId, {
                members: chatStateStore.getProp(clientChat.chatId, "members"),
                blockedUsers: chatStateStore.getProp(clientChat.chatId, "blockedUsers"),
                pinnedMessages: chatStateStore.getProp(clientChat.chatId, "pinnedMessages"),
                latestEventIndex,
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                rules: chatStateStore.getProp(clientChat.chatId, "rules")!,
            });
            chatStateStore.setProp(clientChat.chatId, "members", gd.members);
            chatStateStore.setProp(clientChat.chatId, "blockedUsers", gd.blockedUsers);
            chatStateStore.setProp(clientChat.chatId, "pinnedMessages", gd.pinnedMessages);
            chatStateStore.setProp(clientChat.chatId, "rules", gd.rules);
            await updateUserStore(
                api,
                clientChat.chatId,
                user.userId,
                userIdsFromEvents(currentEvents)
            );
        }
    }
}

function addPinnedMessage(chatId: string, messageIndex: number): void {
    chatStateStore.updateProp(chatId, "pinnedMessages", (s) => {
        s.add(messageIndex);
        return new Set(s);
    });
}

function removePinnedMessage(chatId: string, messageIndex: number): void {
    chatStateStore.updateProp(chatId, "pinnedMessages", (s) => {
        s.delete(messageIndex);
        return new Set(s);
    });
}

export function unpinMessage(
    api: ServiceContainer,
    clientChat: ChatSummary,
    messageIndex: number
): void {
    if (clientChat.kind === "group_chat") {
        removePinnedMessage(clientChat.chatId, messageIndex);
        api.unpinMessage(clientChat.chatId, messageIndex)
            .then((resp) => {
                if (resp !== "success" && resp !== "no_change") {
                    toastStore.showFailureToast("unpinMessageFailed");
                    api.logError("Unpin message failed: ", resp);
                    addPinnedMessage(clientChat.chatId, messageIndex);
                }
            })
            .catch((err) => {
                toastStore.showFailureToast("unpinMessageFailed");
                api.logError("Unpin message failed: ", err);
                addPinnedMessage(clientChat.chatId, messageIndex);
            });
    }
}

export function pinMessage(
    api: ServiceContainer,
    clientChat: ChatSummary,
    messageIndex: number
): void {
    if (clientChat.kind === "group_chat") {
        addPinnedMessage(clientChat.chatId, messageIndex);
        api.pinMessage(clientChat.chatId, messageIndex)
            .then((resp) => {
                if (resp !== "success" && resp !== "no_change") {
                    toastStore.showFailureToast("pinMessageFailed");
                    api.logError("Pin message failed: ", resp);
                    removePinnedMessage(clientChat.chatId, messageIndex);
                }
            })
            .catch((err) => {
                toastStore.showFailureToast("pinMessageFailed");
                api.logError("Pin message failed: ", err);
                removePinnedMessage(clientChat.chatId, messageIndex);
            });
    }
}

export function removeMessage(
    currentUserId: string,
    clientChat: ChatSummary,
    messageId: bigint,
    userId: string,
    threadRootMessageIndex: number | undefined
): void {
    if (userId === currentUserId) {
        const userIds = chatStateStore.getProp(clientChat.chatId, "userIds");
        rtcConnectionsManager.sendMessage([...userIds], {
            kind: "remote_user_removed_message",
            chatType: clientChat.kind,
            chatId: clientChat.chatId,
            messageId: messageId,
            userId: userId,
            threadRootMessageIndex,
        });
    }
    const key =
        threadRootMessageIndex === undefined
            ? clientChat.chatId
            : `${clientChat.chatId}_${threadRootMessageIndex}`;
    unconfirmed.delete(key, messageId);
    if (threadRootMessageIndex === undefined) {
        messagesRead.removeUnconfirmedMessage(clientChat.chatId, messageId);
    }
}

export async function sendMessage(
    api: ServiceContainer,
    user: CreatedUser,
    serverChat: ChatSummary,
    clientChat: ChatSummary,
    currentEvents: EventWrapper<ChatEvent>[],
    messageEvent: EventWrapper<Message>,
    threadRootMessageIndex: number | undefined
): Promise<number | undefined> {
    let jumpingTo: number | undefined = undefined;
    const key =
        threadRootMessageIndex === undefined
            ? clientChat.chatId
            : `${clientChat.chatId}_${threadRootMessageIndex}`;

    if (threadRootMessageIndex === undefined) {
        if (!upToDate(clientChat, currentEvents)) {
            jumpingTo = await loadEventWindow(
                api,
                user,
                serverChat,
                clientChat,
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                clientChat.latestMessage!.event.messageIndex
            );
        }
    }

    unconfirmed.add(key, messageEvent);

    rtcConnectionsManager.sendMessage([...chatStateStore.getProp(clientChat.chatId, "userIds")], {
        kind: "remote_user_sent_message",
        chatType: clientChat.kind,
        chatId: clientChat.chatId,
        messageEvent: serialiseMessageForRtc(messageEvent),
        userId: user.userId,
        threadRootMessageIndex,
    });

    if (threadRootMessageIndex === undefined) {
        // mark our own messages as read manually since we will not be observing them
        messagesRead.markMessageRead(
            clientChat.chatId,
            messageEvent.event.messageIndex,
            messageEvent.event.messageId
        );

        currentChatDraftMessage.clear(clientChat.chatId);
    }

    return jumpingTo;
}

export async function handleMessageSentByOther(
    api: ServiceContainer,
    user: CreatedUser,
    clientChat: ChatSummary,
    messageEvent: EventWrapper<Message>
): Promise<void> {
    const confirmedLoaded = confirmedEventIndexesLoaded(clientChat.chatId);

    if (indexIsInRanges(messageEvent.index, confirmedLoaded)) {
        // We already have this confirmed message
        return;
    }

    const isAdjacentToAlreadyLoadedEvents =
        indexIsInRanges(messageEvent.index - 1, confirmedLoaded) ||
        indexIsInRanges(messageEvent.index + 1, confirmedLoaded);

    if (!isAdjacentToAlreadyLoadedEvents) {
        return;
    }

    await handleEventsResponse(api, user, clientChat, {
        events: [messageEvent],
        affectedEvents: [],
        latestEventIndex: undefined,
    });
}

export function forwardMessage(
    api: ServiceContainer,
    user: CreatedUser,
    serverChat: ChatSummary,
    clientChat: ChatSummary,
    currentEvents: EventWrapper<ChatEvent>[],
    evt: EventWrapper<Message>
): Promise<number | undefined> {
    api.sendMessage(clientChat, user, [], evt.event)
        .then(([resp, msg]) => {
            if (resp.kind === "success") {
                onSendMessageSuccess(clientChat.chatId, resp, msg, undefined);
                trackEvent("forward_message");
            } else {
                removeMessage(user.userId, clientChat, msg.messageId, user.userId, undefined);
                toastStore.showFailureToast("errorSendingMessage");
            }
        })
        .catch((err) => {
            removeMessage(user.userId, clientChat, evt.event.messageId, user.userId, undefined);
            console.log(err);
            toastStore.showFailureToast("errorSendingMessage");
            api.logError("Exception forwarding message", err);
        });

    return sendMessage(api, user, serverChat, clientChat, currentEvents, evt, undefined);
}

export function sendMessageWithAttachment(
    api: ServiceContainer,
    user: CreatedUser,
    serverChat: ChatSummary,
    clientChat: ChatSummary,
    currentEvents: EventWrapper<ChatEvent>[],
    evt: EventWrapper<Message>,
    mentioned: User[],
    threadRootMessageIndex: number | undefined
): Promise<number | undefined> {
    api.sendMessage(clientChat, user, mentioned, evt.event, threadRootMessageIndex)
        .then(([resp, msg]) => {
            if (resp.kind === "success" || resp.kind === "transfer_success") {
                onSendMessageSuccess(clientChat.chatId, resp, msg, threadRootMessageIndex);
                if (msg.kind === "message" && msg.content.kind === "crypto_content") {
                    api.refreshAccountBalance(msg.content.transfer.token, user.cryptoAccount);
                }
                if (threadRootMessageIndex !== undefined) {
                    trackEvent("sent_threaded_message");
                } else {
                    if (clientChat.kind === "direct_chat") {
                        trackEvent("sent_direct_message");
                    } else {
                        if (clientChat.public) {
                            trackEvent("sent_public_group_message");
                        } else {
                            trackEvent("sent_private_group_message");
                        }
                    }
                }
                if (msg.repliesTo !== undefined) {
                    // double counting here which I think is OK since we are limited to string events
                    trackEvent("replied_to_message");
                }
            } else {
                removeMessage(
                    user.userId,
                    clientChat,
                    msg.messageId,
                    user.userId,
                    threadRootMessageIndex
                );
                toastStore.showFailureToast("errorSendingMessage");
            }
        })
        .catch((err) => {
            removeMessage(
                user.userId,
                clientChat,
                evt.event.messageId,
                user.userId,
                threadRootMessageIndex
            );
            console.log(err);
            toastStore.showFailureToast("errorSendingMessage");
            api.logError("Exception sending message", err);
        });

    return sendMessage(
        api,
        user,
        serverChat,
        clientChat,
        currentEvents,
        evt,
        threadRootMessageIndex
    );
}

function onSendMessageSuccess(
    chatId: string,
    resp: SendMessageSuccess | TransferSuccess,
    msg: Message,
    threadRootMessageIndex: number | undefined
) {
    const event = mergeSendMessageResponse(msg, resp);
    addServerEventsToStores(chatId, [event], threadRootMessageIndex);
    if (threadRootMessageIndex === undefined) {
        updateSummaryWithConfirmedMessage(chatId, event);
    }
}