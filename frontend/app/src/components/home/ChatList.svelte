<script lang="ts">
    import Close from "svelte-material-icons/Close.svelte";
    import Compass from "svelte-material-icons/CompassOutline.svelte";
    import SelectedCommunityHeader from "./communities/SelectedCommunityHeader.svelte";
    import ChatListSearch from "./ChatListSearch.svelte";
    import ChatSummary from "./ChatSummary.svelte";
    import { _ } from "svelte-i18n";
    import {
        type ChatSummary as ChatSummaryType,
        type GroupMatch,
        type UserSummary,
        OpenChat,
        type GroupSearchResponse,
        routeForChatIdentifier,
        chatIdentifiersEqual,
        type ChannelMatch,
        emptyCombinedUnreadCounts,
    } from "openchat-client";
    import { createEventDispatcher, getContext, onMount, tick } from "svelte";
    import SearchResult from "./SearchResult.svelte";
    import page from "page";
    import NotificationsBar from "./NotificationsBar.svelte";
    import { chatListScroll } from "../../stores/scrollPos";
    import Button from "../Button.svelte";
    import { menuCloser } from "../../actions/closeMenu";
    import ThreadPreviews from "./thread/ThreadPreviews.svelte";
    import { iconSize } from "../../stores/iconSize";
    import { mobileWidth } from "../../stores/screenDimensions";
    import { exploreGroupsDismissed } from "../../stores/settings";
    import { rightPanelHistory } from "../../stores/rightPanel";
    import GroupChatsHeader from "./communities/GroupChatsHeader.svelte";
    import DirectChatsHeader from "./communities/DirectChatsHeader.svelte";
    import FavouriteChatsHeader from "./communities/FavouriteChatsHeader.svelte";
    import PreviewWrapper from "./communities/PreviewWrapper.svelte";
    import { routeForScope } from "../../routes";
    import ButtonGroup from "../ButtonGroup.svelte";
    import FilteredUsername from "../FilteredUsername.svelte";
    import ChatListSectionButton from "./ChatListSectionButton.svelte";

    const client = getContext<OpenChat>("client");

    let groupSearchResults: Promise<GroupSearchResponse> | undefined = undefined;
    let userSearchResults: Promise<UserSummary[]> | undefined = undefined;
    let channelSearchResults: Promise<ChannelMatch[]> | undefined = undefined;
    let searchTerm: string = "";
    let searchResultsAvailable: boolean = false;

    const dispatch = createEventDispatcher();

    let view: "chats" | "threads" = "chats";

    $: createdUser = client.user;
    $: selectedChatId = client.selectedChatId;
    $: chatListScope = client.chatListScope;
    $: numberOfThreadsStore = client.numberOfThreadsStore;
    $: selectedCommunity = client.selectedCommunity;
    $: showPreview =
        $mobileWidth &&
        $selectedCommunity?.membership.role === "none" &&
        $selectedChatId === undefined;
    $: chatSummariesListStore = client.chatSummariesListStore;
    $: userStore = client.userStore;
    $: user = $userStore[$createdUser.userId];
    $: lowercaseSearch = searchTerm.toLowerCase();
    $: showExploreGroups =
        ($chatListScope.kind === "none" || $chatListScope.kind === "group_chat") &&
        !$exploreGroupsDismissed &&
        !searchResultsAvailable;
    $: showBrowseChannnels = $chatListScope.kind === "community" && !searchResultsAvailable;
    $: unreadDirectCounts = client.unreadDirectCounts;
    $: unreadGroupCounts = client.unreadGroupCounts;
    $: unreadFavouriteCounts = client.unreadFavouriteCounts;
    $: unreadCommunityChannelCounts = client.unreadCommunityChannelCounts;

    let unreadCounts = emptyCombinedUnreadCounts();
    $: {
        switch ($chatListScope.kind) {
            case "group_chat": {
                unreadCounts = $unreadGroupCounts;
                break;
            }
            case "direct_chat": {
                unreadCounts = $unreadDirectCounts;
                break;
            }
            case "favourite": {
                unreadCounts = $unreadFavouriteCounts;
                break;
            }
            case "community": {
                unreadCounts =
                    $unreadCommunityChannelCounts.get($chatListScope.id) ??
                    emptyCombinedUnreadCounts();
                break;
            }
            default:
                unreadCounts = emptyCombinedUnreadCounts();
        }
    }

    $: {
        // need to make sure that we reset the view each time the chat list scope changes
        if ($chatListScope) {
            view = "chats";
        }
    }

    function cancelPreview() {
        if ($selectedCommunity) {
            client.removeCommunity($selectedCommunity.id);
            page(routeForScope(client.getDefaultScope()));
        }
    }

    function chatMatchesSearch(chat: ChatSummaryType): boolean {
        if (chat.kind === "group_chat" || chat.kind === "channel") {
            return (
                chat.name.toLowerCase().indexOf(lowercaseSearch) >= 0 ||
                chat.description.toLowerCase().indexOf(lowercaseSearch) >= 0
            );
        }

        if (chat.kind === "direct_chat") {
            const user = $userStore[chat.them.userId];
            if (user !== undefined) {
                return (
                    user.username.toLowerCase().indexOf(lowercaseSearch) >= 0 ||
                    (user.displayName !== undefined &&
                        user.displayName.toLowerCase().indexOf(lowercaseSearch) >= 0)
                );
            } else {
                return false;
            }
        }
        return false;
    }

    $: chats =
        searchTerm !== ""
            ? $chatSummariesListStore.filter(chatMatchesSearch)
            : $chatSummariesListStore;

    function chatWith(userId: string): void {
        dispatch("chatWith", { kind: "direct_chat", userId });
        closeSearch();
    }

    /**
     * All we need to do here is push the route
     * the routing will take care of the rest
     */
    function selectGroup({ chatId }: GroupMatch): void {
        page(routeForChatIdentifier($chatListScope.kind, chatId));
        closeSearch();
    }

    function selectChannel({ id }: ChannelMatch): void {
        page(routeForChatIdentifier($chatListScope.kind, id));
        closeSearch();
    }

    function closeSearch() {
        dispatch("searchEntered", "");
    }

    function chatSelected(ev: CustomEvent<ChatSummaryType>): void {
        chatScrollTop = chatListElement.scrollTop;
        const url = routeForChatIdentifier($chatListScope.kind, ev.detail.id);
        page(url);
        closeSearch();
    }

    let chatListElement: HTMLElement;
    let chatScrollTop = 0;

    onMount(() => {
        tick().then(() => {
            if (chatListElement) {
                chatListElement.scrollTop = $chatListScroll;
            }
        });

        return () => {
            chatListScroll.set(chatScrollTop);
        };
    });

    function onSearchEntered(ev: CustomEvent<unknown>) {
        setView("chats");
        dispatch("searchEntered", ev.detail);
    }

    function setView(v: "chats" | "threads"): void {
        view = v;
        chatListElement.scrollTop = 0;
        chatListScroll.set(0);
    }

    function showChannels() {
        if ($chatListScope.kind === "community") {
            rightPanelHistory.set([
                {
                    kind: "community_channels",
                },
            ]);
        }
    }
</script>

{#if user}
    {#if $chatListScope.kind === "favourite"}
        <FavouriteChatsHeader />
    {:else if $chatListScope.kind === "group_chat"}
        <GroupChatsHeader on:newGroup />
    {:else if $chatListScope.kind === "direct_chat"}
        <DirectChatsHeader />
    {:else if $selectedCommunity && $chatListScope.kind === "community"}
        <SelectedCommunityHeader
            community={$selectedCommunity}
            on:leaveCommunity
            on:deleteCommunity
            on:editCommunity
            on:communityDetails
            on:newChannel />
    {/if}

    <ChatListSearch
        bind:userSearchResults
        bind:groupSearchResults
        bind:channelSearchResults
        bind:searchResultsAvailable
        bind:searchTerm
        on:searchEntered={onSearchEntered} />

    {#if $numberOfThreadsStore > 0}
        <div class="section-selector">
            <ChatListSectionButton
                on:click={() => setView("chats")}
                unread={unreadCounts.chats}
                title={$_("chats")}
                selected={view === "chats"} />
            <ChatListSectionButton
                unread={unreadCounts.threads}
                on:click={() => setView("threads")}
                title={$_("thread.previewTitle")}
                selected={view === "threads"} />
        </div>
    {/if}

    <div use:menuCloser bind:this={chatListElement} class="body">
        {#if view === "threads"}
            <ThreadPreviews />
        {:else}
            <div class="chat-summaries">
                {#if searchResultsAvailable && chats.length > 0}
                    <h3 class="search-subtitle">{$_("yourChats")}</h3>
                {/if}
                {#each chats as chatSummary}
                    <ChatSummary
                        {chatSummary}
                        selected={chatIdentifiersEqual($selectedChatId, chatSummary.id)}
                        visible={searchTerm !== "" || !chatSummary.membership.archived}
                        on:chatSelected={chatSelected}
                        on:leaveGroup
                        on:unarchiveChat
                        on:toggleMuteNotifications />
                {/each}

                {#if channelSearchResults !== undefined}
                    <div class="search-matches">
                        {#await channelSearchResults then resp}
                            {#if resp.length > 0}
                                <h3 class="search-subtitle">{$_("communities.otherChannels")}</h3>
                                {#each resp as channel, i (channel.id.channelId)}
                                    <SearchResult
                                        index={i}
                                        avatarUrl={client.groupAvatarUrl(channel.avatar)}
                                        on:click={() => selectChannel(channel)}>
                                        <h4 class="search-item-title">
                                            {channel.name}
                                        </h4>
                                        <p title={channel.description} class="search-item-desc">
                                            {channel.description}
                                        </p>
                                    </SearchResult>
                                {/each}
                            {/if}
                        {/await}
                    </div>
                {/if}

                {#if userSearchResults !== undefined}
                    <div class="search-matches">
                        {#await userSearchResults then resp}
                            {#if resp.length > 0}
                                <h3 class="search-subtitle">{$_("users")}</h3>
                                {#each resp as user, i (user.userId)}
                                    <SearchResult
                                        index={i}
                                        avatarUrl={client.userAvatarUrl(user)}
                                        on:click={() => chatWith(user.userId)}>
                                        <div class="user-result">
                                            <h4 class:diamond={user.diamond}>
                                                <FilteredUsername
                                                    {searchTerm}
                                                    username={user.displayName ?? user.username} />
                                            </h4>
                                            <div class="username">
                                                <FilteredUsername
                                                    {searchTerm}
                                                    username={"@" + user.username} />
                                            </div>
                                        </div>
                                    </SearchResult>
                                {/each}
                            {/if}
                        {/await}
                    </div>
                {/if}
                {#if groupSearchResults !== undefined}
                    <div class="search-matches">
                        {#await groupSearchResults then resp}
                            {#if resp.kind === "success" && resp.matches.length > 0}
                                <h3 class="search-subtitle">{$_("publicGroups")}</h3>
                                {#each resp.matches as group, i (group.chatId.groupId)}
                                    <SearchResult
                                        index={i}
                                        avatarUrl={client.groupAvatarUrl(group)}
                                        on:click={() => selectGroup(group)}>
                                        <h4 class="search-item-title">
                                            {group.name}
                                        </h4>
                                        <p title={group.description} class="search-item-desc">
                                            {group.description}
                                        </p>
                                    </SearchResult>
                                {/each}
                            {/if}
                        {/await}
                    </div>
                {/if}
            </div>
            {#if showExploreGroups}
                <div class="explore-groups" on:click={() => page("/groups")}>
                    <div class="disc">
                        <Compass size={$iconSize} color={"var(--icon-txt)"} />
                    </div>
                    <div class="label">{$_("exploreGroups")}</div>
                    <div on:click={() => exploreGroupsDismissed.set(true)} class="close">
                        <Close viewBox="0 -3 24 24" size={$iconSize} color={"var(--button-txt)"} />
                    </div>
                </div>
            {/if}
            {#if showBrowseChannnels}
                <div class="browse-channels" on:click={showChannels}>
                    <div class="disc hash">#</div>
                    <div class="label">{$_("communities.browseChannels")}</div>
                </div>
            {/if}
        {/if}
    </div>
    <NotificationsBar />
    {#if showPreview}
        <PreviewWrapper let:joiningCommunity let:joinCommunity>
            <div class="join">
                <ButtonGroup align="center">
                    <Button secondary small on:click={cancelPreview}>
                        {$_("leave")}
                    </Button>
                    <Button
                        loading={joiningCommunity}
                        disabled={joiningCommunity}
                        on:click={joinCommunity}>{$_("communities.joinCommunity")}</Button>
                </ButtonGroup>
            </div>
        </PreviewWrapper>
    {/if}
{/if}

<style lang="scss">
    .body {
        overflow: auto;
        flex: auto;
        @include nice-scrollbar();
        position: relative;
    }
    .chat-summaries {
        overflow: auto;
        overflow-x: hidden;
    }

    .join {
        position: sticky;
        bottom: 0;
        padding: $sp3 $sp4;
        background-color: var(--entry-bg);
    }

    .section-selector {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        margin: 0 $sp4 $sp4 $sp4;
        gap: $sp3;
        @include mobile() {
            margin: 0 $sp3 $sp3 $sp3;
        }
    }

    .search-subtitle {
        margin-bottom: $sp3;
        margin-left: 0;
        padding: 0 $sp4;

        @include mobile() {
            padding: 0 $sp3;
        }
    }

    .search-matches {
        margin-top: $sp4;
    }
    .search-item-title {
        margin-bottom: $sp3;
    }
    .search-item-desc {
        color: var(--txt-light);
        @include font(light, normal, fs-80);
        @include ellipsis();
    }

    .explore-groups,
    .browse-channels {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: toRem(80);
        border-top: var(--bw) solid var(--bd);
        border-bottom: var(--bw) solid var(--bd);
        padding: $sp4;
        gap: toRem(12);
        cursor: pointer;

        @include mobile() {
            padding: $sp3 toRem(10);
        }

        .label {
            flex: auto;
        }

        .disc {
            display: flex;
            align-items: center;
            justify-content: center;
            align-content: center;
            text-align: center;
            height: toRem(48);
            width: toRem(48);
            background-color: var(--icon-hv);
            border-radius: 50%;

            &.hash {
                @include font-size(fs-120);
            }
        }
    }

    .user-result {
        flex: 1;
        display: flex;
        flex-direction: column;

        .diamond {
            @include diamond();
        }

        .username {
            font-weight: 200;
            color: var(--txt-light);
        }
    }
</style>
