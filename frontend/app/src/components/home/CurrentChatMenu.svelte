<!-- svelte-ignore a11y-click-events-have-key-events -->
<script lang="ts">
    import CancelIcon from "svelte-material-icons/Cancel.svelte";
    import TickIcon from "svelte-material-icons/Check.svelte";
    import AccountMultiplePlus from "svelte-material-icons/AccountMultiplePlus.svelte";
    import Import from "svelte-material-icons/Import.svelte";
    import AccountMultiple from "svelte-material-icons/AccountMultiple.svelte";
    import LocationExit from "svelte-material-icons/LocationExit.svelte";
    import ConvertToCommunity from "../icons/ConvertToCommunity.svelte";
    import Tune from "svelte-material-icons/Tune.svelte";
    import Pin from "svelte-material-icons/Pin.svelte";
    import Magnify from "svelte-material-icons/Magnify.svelte";
    import DotsVertical from "svelte-material-icons/DotsVertical.svelte";
    import Bell from "svelte-material-icons/Bell.svelte";
    import BellOff from "svelte-material-icons/BellOff.svelte";
    import FileDocument from "svelte-material-icons/FileDocument.svelte";
    import ChatQuestionIcon from "svelte-material-icons/ChatQuestion.svelte";
    import MenuIcon from "../MenuIcon.svelte";
    import HoverIcon from "../HoverIcon.svelte";
    import Menu from "../Menu.svelte";
    import MenuItem from "../MenuItem.svelte";
    import { iconSize } from "../../stores/iconSize";
    import { _ } from "svelte-i18n";
    import type { ChatSummary, OpenChat } from "openchat-client";
    import { createEventDispatcher, getContext, onMount } from "svelte";
    import { notificationsSupported } from "../../utils/notifications";
    import { toastStore } from "../../stores/toast";
    import { mobileWidth } from "../../stores/screenDimensions";
    import { rightPanelHistory } from "../../stores/rightPanel";
    import { rtlStore } from "../../stores/rtl";
    import HeartMinus from "../icons/HeartMinus.svelte";
    import HeartPlus from "../icons/HeartPlus.svelte";
    import { interpolateLevel } from "../../utils/i18n";

    const client = getContext<OpenChat>("client");
    const dispatch = createEventDispatcher();

    export let selectedChatSummary: ChatSummary;
    export let blocked: boolean;
    export let showSuspendUserModal = false;
    export let hasPinned: boolean;

    $: platformModerator = client.platformModerator;
    $: isDiamond = client.isDiamond;
    $: favouritesStore = client.favouritesStore;
    $: messagesRead = client.messagesRead;
    $: isProposalGroup = client.isProposalGroup;
    $: governanceCanisterId =
        selectedChatSummary.kind !== "direct_chat" &&
        selectedChatSummary.subtype?.kind === "governance_proposals"
            ? selectedChatSummary.subtype.governanceCanisterId
            : undefined;
    $: canMakeProposals =
        client.tryGetNervousSystem(governanceCanisterId)?.submittingProposalsEnabled ?? false;
    $: userId = selectedChatSummary.kind === "direct_chat" ? selectedChatSummary.them.userId : "";
    $: userStore = client.userStore;
    $: isBot = $userStore[userId]?.kind === "bot";
    $: isSuspended = $userStore[userId]?.suspended ?? false;
    $: lastState = $rightPanelHistory[$rightPanelHistory.length - 1] ?? { kind: "no_panel" };
    $: groupDetailsSelected = lastState.kind === "group_details";
    $: pinnedSelected = lastState.kind === "show_pinned";
    $: membersSelected = lastState.kind === "show_group_members";
    $: inviteMembersSelected = lastState.kind === "invite_group_users";
    $: desktop = !$mobileWidth;
    $: canConvert =
        selectedChatSummary.kind === "group_chat" &&
        client.canConvertGroupToCommunity(selectedChatSummary.id);
    $: canImportToCommunity = client.canImportToCommunity(selectedChatSummary.id);

    let hasUnreadPinned = false;

    $: {
        setUnreadPinned(hasPinned, selectedChatSummary);
    }

    onMount(() => {
        return messagesRead.subscribe(() => setUnreadPinned(hasPinned, selectedChatSummary));
    });

    function setUnreadPinned(hasPinned: boolean, chat: ChatSummary) {
        hasUnreadPinned =
            hasPinned &&
            (chat.kind === "group_chat" || chat.kind === "channel") &&
            client.unreadPinned(chat.id, chat.dateLastPinned);
    }

    function toggleMuteNotifications(mute: boolean) {
        dispatch("toggleMuteNotifications", { chatId: selectedChatSummary.id, mute });
    }

    function addToFavourites() {
        client.addToFavourites(selectedChatSummary.id);
    }

    function removeFromFavourites() {
        client.removeFromFavourites(selectedChatSummary.id);
    }

    function showGroupDetails() {
        dispatch("showGroupDetails");
    }

    function showPinned() {
        rightPanelHistory.set([
            {
                kind: "show_pinned",
            },
        ]);
    }

    function searchChat() {
        dispatch("searchChat", "");
    }

    function showProposalFilters() {
        dispatch("showProposalFilters");
    }

    function showGroupMembers() {
        dispatch("showGroupMembers", true);
    }

    function blockUser() {
        if (selectedChatSummary.kind === "direct_chat") {
            client.blockUserFromDirectChat(selectedChatSummary.them.userId).then((success) => {
                if (success) {
                    toastStore.showSuccessToast("blockUserSucceeded");
                } else {
                    toastStore.showFailureToast("blockUserFailed");
                }
            });
        }
    }

    function unblockUser() {
        if (selectedChatSummary.kind === "direct_chat") {
            client.unblockUserFromDirectChat(selectedChatSummary.them.userId).then((success) => {
                if (success) {
                    toastStore.showSuccessToast("unblockUserSucceeded");
                } else {
                    toastStore.showFailureToast("unblockUserFailed");
                }
            });
        }
    }

    function showInviteGroupUsers() {
        dispatch("showInviteGroupUsers", true);
    }

    function leaveGroup() {
        if (selectedChatSummary.kind === "direct_chat") return;
        dispatch("leaveGroup", {
            kind: "leave",
            chatId: selectedChatSummary.id,
            level: selectedChatSummary.level,
        });
    }

    function convertToCommunity() {
        if (!$isDiamond) {
            dispatch("upgrade");
        } else {
            if (selectedChatSummary.kind === "group_chat") {
                dispatch("convertGroupToCommunity", selectedChatSummary);
            }
        }
    }

    function importToCommunity() {
        if (selectedChatSummary.kind === "group_chat") {
            dispatch("importToCommunity", selectedChatSummary);
        }
    }

    function freezeGroup() {
        if (selectedChatSummary.id.kind === "group_chat") {
            client.freezeGroup(selectedChatSummary.id, undefined).then((success) => {
                if (!success) {
                    toastStore.showFailureToast("failedToFreezeGroup");
                }
            });
        }
    }

    function unfreezeGroup() {
        if (selectedChatSummary.id.kind === "group_chat") {
            client.unfreezeGroup(selectedChatSummary.id).then((success) => {
                if (!success) {
                    toastStore.showFailureToast("failedToUnfreezeGroup");
                }
            });
        }
    }

    function onSuspendUser() {
        showSuspendUserModal = true;
    }

    function unsuspendUser() {
        client.unsuspendUser(userId).then((success) => {
            if (success) {
                toastStore.showSuccessToast("unsuspendedUser");
            } else {
                toastStore.showFailureToast("failedToUnsuspendUser");
            }
        });
    }

    function makeProposal() {
        dispatch("makeProposal");
    }
</script>

{#if desktop}
    {#if $isProposalGroup}
        <span on:click={showProposalFilters}>
            <HoverIcon title={$_("showFilters")}>
                <Tune size={$iconSize} color={"var(--icon-txt)"} />
            </HoverIcon>
        </span>
    {/if}
    <span on:click={searchChat}>
        <HoverIcon title={$_("searchChat")}>
            <Magnify size={$iconSize} color={"var(--icon-txt)"} />
        </HoverIcon>
    </span>

    {#if hasPinned}
        <span on:click={showPinned}>
            <HoverIcon title={$_("showPinned")}>
                <div
                    class="pin"
                    class:unread={!pinnedSelected && hasUnreadPinned}
                    class:rtl={$rtlStore}>
                    <Pin
                        size={$iconSize}
                        color={pinnedSelected ? "var(--icon-selected)" : "var(--icon-txt)"} />
                </div>
            </HoverIcon>
        </span>
    {/if}

    {#if selectedChatSummary.kind === "group_chat" || selectedChatSummary.kind === "channel"}
        <span on:click={showGroupDetails}>
            <HoverIcon title={interpolateLevel("groupDetails", selectedChatSummary.level)}>
                <FileDocument
                    size={$iconSize}
                    color={groupDetailsSelected ? "var(--icon-selected)" : "var(--icon-txt)"} />
            </HoverIcon>
        </span>
        <span on:click={showGroupMembers}>
            <HoverIcon title={$_("members")}>
                <AccountMultiple
                    size={$iconSize}
                    color={membersSelected ? "var(--icon-selected)" : "var(--icon-txt)"} />
            </HoverIcon>
        </span>
        {#if client.canInviteUsers(selectedChatSummary.id)}
            <span on:click={showInviteGroupUsers}>
                <HoverIcon
                    title={interpolateLevel("group.inviteUsers", selectedChatSummary.level, true)}>
                    <AccountMultiplePlus
                        size={$iconSize}
                        color={inviteMembersSelected
                            ? "var(--icon-selected)"
                            : "var(--icon-txt)"} />
                </HoverIcon>
            </span>
        {/if}
    {/if}
{/if}
<div class="menu">
    <MenuIcon position={"bottom"} align={"end"}>
        <div slot="icon">
            <HoverIcon title={$_("chatMenu")}>
                <DotsVertical size={$iconSize} color={"var(--icon-txt)"} />
            </HoverIcon>
        </div>
        <div slot="menu">
            <Menu>
                {#if !$favouritesStore.has(selectedChatSummary.id)}
                    <MenuItem on:click={addToFavourites}>
                        <HeartPlus size={$iconSize} color={"var(--menu-warn)"} slot="icon" />
                        <div slot="text">
                            {$_("communities.addToFavourites")}
                        </div>
                    </MenuItem>
                {:else}
                    <MenuItem on:click={removeFromFavourites}>
                        <HeartMinus size={$iconSize} color={"var(--menu-warn)"} slot="icon" />
                        <div slot="text">
                            {$_("communities.removeFromFavourites")}
                        </div>
                    </MenuItem>
                {/if}
                {#if $mobileWidth}
                    {#if $isProposalGroup}
                        <MenuItem on:click={showProposalFilters}>
                            <Tune size={$iconSize} color={"var(--icon-inverted-txt)"} slot="icon" />
                            <div slot="text">{$_("proposal.filter")}</div>
                        </MenuItem>
                    {/if}
                    <MenuItem on:click={searchChat}>
                        <Magnify size={$iconSize} color={"var(--icon-inverted-txt)"} slot="icon" />
                        <div slot="text">{$_("searchChat")}</div>
                    </MenuItem>
                {/if}
                {#if selectedChatSummary.kind === "group_chat" || selectedChatSummary.kind === "channel"}
                    {#if $mobileWidth}
                        {#if hasPinned}
                            <MenuItem on:click={showPinned}>
                                <Pin
                                    size={$iconSize}
                                    color={hasUnreadPinned
                                        ? "var(--icon-selected)"
                                        : "var(--icon-inverted-txt)"}
                                    slot="icon" />
                                <div slot="text">{$_("showPinned")}</div>
                            </MenuItem>
                        {/if}
                        <MenuItem on:click={showGroupDetails}>
                            <FileDocument
                                size={$iconSize}
                                color={"var(--icon-inverted-txt)"}
                                slot="icon" />
                            <div slot="text">
                                {interpolateLevel("groupDetails", selectedChatSummary.level)}
                            </div>
                        </MenuItem>
                        <MenuItem on:click={showGroupMembers}>
                            <AccountMultiple
                                size={$iconSize}
                                color={"var(--icon-inverted-txt)"}
                                slot="icon" />
                            <div slot="text">{$_("members")}</div>
                        </MenuItem>
                        {#if client.canInviteUsers(selectedChatSummary.id)}
                            <MenuItem on:click={showInviteGroupUsers}>
                                <AccountMultiplePlus
                                    size={$iconSize}
                                    color={"var(--icon-inverted-txt)"}
                                    slot="icon" />
                                <div slot="text">
                                    {interpolateLevel(
                                        "group.inviteUsers",
                                        selectedChatSummary.level,
                                        true
                                    )}
                                </div>
                            </MenuItem>
                        {/if}
                    {/if}

                    {#if notificationsSupported}
                        {#if selectedChatSummary.membership.notificationsMuted === true}
                            <MenuItem on:click={() => toggleMuteNotifications(false)}>
                                <Bell
                                    size={$iconSize}
                                    color={"var(--icon-inverted-txt)"}
                                    slot="icon" />
                                <div slot="text">{$_("unmuteNotifications")}</div>
                            </MenuItem>
                        {:else}
                            <MenuItem on:click={() => toggleMuteNotifications(true)}>
                                <BellOff
                                    size={$iconSize}
                                    color={"var(--icon-inverted-txt)"}
                                    slot="icon" />
                                <div slot="text">{$_("muteNotifications")}</div>
                            </MenuItem>
                        {/if}
                    {/if}

                    {#if canMakeProposals}
                        <MenuItem on:click={makeProposal}>
                            <ChatQuestionIcon
                                size={$iconSize}
                                color={"var(--icon-inverted-txt)"}
                                slot="icon" />
                            <div slot="text">{$_("proposal.makeProposal")}</div>
                        </MenuItem>
                    {/if}

                    {#if $platformModerator}
                        {#if client.isFrozen(selectedChatSummary.id)}
                            <MenuItem warning on:click={unfreezeGroup}>
                                <TickIcon size={$iconSize} color={"var(--menu-warn"} slot="icon" />
                                <div slot="text">{$_("unfreezeGroup")}</div>
                            </MenuItem>
                        {:else}
                            <MenuItem warning on:click={freezeGroup}>
                                <CancelIcon
                                    size={$iconSize}
                                    color={"var(--menu-warn"}
                                    slot="icon" />
                                <div slot="text">{$_("freezeGroup")}</div>
                            </MenuItem>
                        {/if}
                    {/if}

                    {#if client.canLeaveGroup(selectedChatSummary.id)}
                        <MenuItem warning on:click={leaveGroup}>
                            <LocationExit size={$iconSize} color={"var(--menu-warn)"} slot="icon" />
                            <div slot="text">
                                {interpolateLevel("leaveGroup", selectedChatSummary.level, true)}
                            </div>
                        </MenuItem>
                    {/if}
                    {#if canConvert}
                        <MenuItem warning on:click={convertToCommunity}>
                            <ConvertToCommunity
                                size={$iconSize}
                                color={"var(--menu-warn)"}
                                slot="icon" />
                            <div slot="text">{$_("communities.convert")}</div>
                        </MenuItem>
                    {/if}
                    {#if canImportToCommunity}
                        <MenuItem warning on:click={importToCommunity}>
                            <Import size={$iconSize} color={"var(--menu-warn)"} slot="icon" />
                            <div slot="text">{$_("communities.import")}</div>
                        </MenuItem>
                    {/if}
                {/if}
                {#if selectedChatSummary.kind === "direct_chat" && !isBot}
                    {#if hasPinned}
                        <MenuItem on:click={showPinned}>
                            <Pin size={$iconSize} color={"var(--icon-inverted-txt)"} slot="icon" />
                            <div slot="text">{$_("showPinned")}</div>
                        </MenuItem>
                    {/if}
                    {#if notificationsSupported}
                        {#if selectedChatSummary.membership.notificationsMuted === true}
                            <MenuItem on:click={() => toggleMuteNotifications(false)}>
                                <Bell
                                    size={$iconSize}
                                    color={"var(--icon-inverted-txt)"}
                                    slot="icon" />
                                <div slot="text">{$_("unmuteNotifications")}</div>
                            </MenuItem>
                        {:else}
                            <MenuItem on:click={() => toggleMuteNotifications(true)}>
                                <BellOff
                                    size={$iconSize}
                                    color={"var(--icon-inverted-txt)"}
                                    slot="icon" />
                                <div slot="text">{$_("muteNotifications")}</div>
                            </MenuItem>
                        {/if}
                    {/if}
                    {#if blocked}
                        <MenuItem on:click={unblockUser}>
                            <CancelIcon
                                size={$iconSize}
                                color={"var(--icon-inverted-txt)"}
                                slot="icon" />
                            <div slot="text">{$_("unblockUser")}</div>
                        </MenuItem>
                    {:else}
                        <MenuItem on:click={blockUser}>
                            <CancelIcon
                                size={$iconSize}
                                color={"var(--icon-inverted-txt)"}
                                slot="icon" />
                            <div slot="text">{$_("blockUser")}</div>
                        </MenuItem>
                    {/if}
                    {#if $platformModerator}
                        {#if isSuspended}
                            <MenuItem on:click={unsuspendUser}>
                                <TickIcon
                                    size={$iconSize}
                                    color={"var(--icon-inverted-txt)"}
                                    slot="icon" />
                                <div slot="text">{$_("unsuspendUser")}</div>
                            </MenuItem>
                        {:else}
                            <MenuItem on:click={onSuspendUser}>
                                <CancelIcon
                                    size={$iconSize}
                                    color={"var(--icon-inverted-txt)"}
                                    slot="icon" />
                                <div slot="text">{$_("suspendUser")}</div>
                            </MenuItem>
                        {/if}
                    {/if}
                {/if}
            </Menu>
        </div>
    </MenuIcon>
</div>

<style lang="scss">
    .menu {
        flex: 0 0 20px;
    }

    $dot-size: 9px;

    .pin {
        position: relative;
        display: grid;
        align-content: center;

        &.unread::after {
            content: "";
            width: $dot-size;
            height: $dot-size;
            background-color: var(--accent);
            border-radius: 50%;
            position: absolute;
            bottom: -$sp2;
            right: -$sp2;
        }

        &.unread.rtl::after {
            left: -$sp2;
            right: auto;
        }
    }
</style>
