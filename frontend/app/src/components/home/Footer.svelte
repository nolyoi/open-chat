<script lang="ts">
    import { _ } from "svelte-i18n";
    import ReplyingTo from "./ReplyingTo.svelte";
    import MessageEntry from "./MessageEntry.svelte";
    import DraftMediaMessage from "./DraftMediaMessage.svelte";
    import { toastStore } from "../../stores/toast";
    import EmojiPicker from "./EmojiPicker.svelte";
    import type {
        ChatSummary,
        EnhancedReplyContext,
        EventWrapper,
        Message,
        MessageAction,
        CreatedUser,
        OpenChat,
        MultiUserChat,
        AttachmentContent,
    } from "openchat-client";
    import { createEventDispatcher, getContext } from "svelte";

    const client = getContext<OpenChat>("client");

    export let blocked: boolean;
    export let preview: boolean;
    export let joining: MultiUserChat | undefined;
    export let chat: ChatSummary;
    export let attachment: AttachmentContent | undefined;
    export let editingEvent: EventWrapper<Message> | undefined;
    export let replyingTo: EnhancedReplyContext | undefined;
    export let textContent: string | undefined;
    export let user: CreatedUser;
    export let mode: "thread" | "message" = "message";

    const dispatch = createEventDispatcher();

    let messageAction: MessageAction = undefined;
    let messageEntry: MessageEntry;

    function fileFromDataTransferItems(items: DataTransferItem[]): File | undefined {
        return items.reduce<File | undefined>((res, item) => {
            if (item.kind === "file") {
                return item.getAsFile() || undefined;
            }
            return res;
        }, undefined);
    }

    function messageContentFromDataTransferItemList(items: DataTransferItem[]) {
        const file = fileFromDataTransferItems(items);
        if (file) {
            client
                .messageContentFromFile(file)
                .then((content) => {
                    let permission = client.contentTypeToPermission(content.kind);
                    if (client.canSendMessage(chat.id, mode, permission)) {
                        dispatch("fileSelected", content);
                    } else {
                        const errorMessage = $_("permissions.notPermitted", {
                            values: {
                                permission: $_(`permissions.threadPermissions.${permission}`),
                            },
                        });
                        toastStore.showFailureToast(errorMessage);
                    }
                })
                .catch((err) => toastStore.showFailureToast(err));
        }
    }

    function onDataTransfer(data: DataTransfer): void {
        const text = data.getData("text/plain") || data.getData("text/uri-list");
        if (text) {
            messageEntry.replaceSelection(text);
        }
        messageContentFromDataTransferItemList([...data.items]);
    }

    function onDrop(e: CustomEvent<DragEvent>) {
        if (e.detail.dataTransfer) {
            onDataTransfer(e.detail.dataTransfer);
            e.detail.preventDefault();
        }
    }

    function onPaste(e: ClipboardEvent) {
        if (e.clipboardData) {
            messageEntry.saveSelection();
            onDataTransfer(e.clipboardData);
            e.preventDefault();
        }
    }

    function emojiSelected(ev: CustomEvent<string>) {
        messageEntry?.replaceSelection(ev.detail);
    }
</script>

<div class="footer">
    <div class="footer-overlay">
        {#if editingEvent === undefined && (replyingTo || attachment !== undefined)}
            <div class="draft-container">
                {#if replyingTo}
                    <ReplyingTo chatId={chat.id} readonly on:cancelReply {user} {replyingTo} />
                {/if}
                {#if attachment !== undefined}
                    <DraftMediaMessage content={attachment} />
                {/if}
            </div>
        {/if}
        {#if messageAction === "emoji"}
            <EmojiPicker {mode} on:emojiSelected={emojiSelected} />
        {/if}
    </div>
    <MessageEntry
        bind:this={messageEntry}
        bind:messageAction
        on:paste={onPaste}
        on:drop={onDrop}
        {mode}
        {preview}
        {blocked}
        {joining}
        {attachment}
        {editingEvent}
        {replyingTo}
        {textContent}
        {chat}
        on:sendMessage
        on:cancelEditEvent
        on:setTextContent
        on:startTyping
        on:stopTyping
        on:createPoll
        on:searchChat
        on:tokenTransfer
        on:createPrizeMessage
        on:attachGif
        on:makeMeme
        on:clearAttachment
        on:fileSelected
        on:audioCaptured
        on:joinGroup
        on:upgrade
        on:createTestMessages />
</div>

<style lang="scss">
    :global(body.witch .middle .footer) {
        @include z-index("footer");
    }

    .footer {
        position: relative;
        flex: 0 0 toRem(60);
        padding-bottom: env(safe-area-inset-bottom);
    }

    .footer-overlay {
        width: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-content: center;
        align-items: flex-start;
        background-color: var(--entry-bg);
    }

    .draft-container {
        max-width: 80%;
        padding: 0 $sp4 $sp4 $sp4;
    }
</style>
