<script lang="ts">
    import Avatar from "../../Avatar.svelte";
    import { _ } from "svelte-i18n";
    import { rtlStore } from "../../../stores/rtl";
    import { AvatarSize, type CommunitySummary, type OpenChat } from "openchat-client";
    import SectionHeader from "../../SectionHeader.svelte";
    import CommunityMenu from "./CommunityMenu.svelte";
    import { getContext } from "svelte";
    import VisibilityLabel from "../VisibilityLabel.svelte";
    import { pushRightPanelHistory } from "../../../stores/rightPanel";

    const client = getContext<OpenChat>("client");

    export let community: CommunitySummary;

    function showCommunityMembers() {
        pushRightPanelHistory({ kind: "show_community_members" });
    }
</script>

<SectionHeader border={false}>
    <div
        role="button"
        tabindex="0"
        on:click={showCommunityMembers}
        class="current-selection"
        class:rtl={$rtlStore}>
        <div class="avatar">
            <Avatar
                url={client.communityAvatarUrl(community.id.communityId, community.avatar)}
                userId={undefined}
                size={AvatarSize.Default} />
        </div>
        <div class="details">
            <h4 class="name">{community.name}</h4>
            <div class="wrapper">
                <VisibilityLabel isPublic={community.public} />
                <div class="members">
                    <span class="num">{community.memberCount.toLocaleString()}</span>
                    {$_("members")}
                </div>
            </div>
        </div>
    </div>
    <span class="menu">
        <CommunityMenu
            on:newChannel
            on:communityDetails
            on:leaveCommunity
            on:editCommunity
            on:deleteCommunity
            {community} />
    </span>
</SectionHeader>

<style lang="scss">
    .current-selection {
        display: flex;
        flex: 1;
        align-items: center;
        gap: $sp3;
        cursor: pointer;
    }
    .wrapper {
        display: flex;
        gap: $sp3;
        align-items: center;
        @include font(book, normal, fs-70);
    }

    .name {
        @include font(book, normal, fs-120);
        margin-bottom: $sp1;
    }

    .members {
        color: var(--txt-light);
        .num {
            color: var(--txt);
            font-weight: 700;
        }
    }
</style>
