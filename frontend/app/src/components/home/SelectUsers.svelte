<script lang="ts">
    import FindUser from "../FindUser.svelte";
    import ErrorMessage from "../ErrorMessage.svelte";
    import UserPill from "../UserPill.svelte";
    import { _ } from "svelte-i18n";
    import type { UserSummary } from "openchat-client";

    export let mode: "add" | "edit";
    export let selectedUsers: UserSummary[];
    export let enabled = true;
    export let userLookup: (searchTerm: string) => Promise<UserSummary[]>;

    let error: string | undefined = undefined;
</script>

{#if selectedUsers.length > 0}
    <div class="selected">
        {#each selectedUsers as user (user.userId)}
            <UserPill on:deleteUser userOrGroup={user} />
        {/each}
    </div>
{/if}
{#if error !== undefined}
    <ErrorMessage>{$_("errorSearchingForUser")}</ErrorMessage>
{/if}

<div class="find-user">
    <FindUser {userLookup} {enabled} {mode} on:selectUser />
</div>

<style lang="scss">
    .selected {
        padding: 0 $sp4 $sp4 $sp4;
        display: flex;
        flex-wrap: wrap;
        gap: $sp3;
    }
</style>
