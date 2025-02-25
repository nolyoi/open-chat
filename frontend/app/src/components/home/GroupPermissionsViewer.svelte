<script lang="ts">
    import { _ } from "svelte-i18n";
    import {
        type ChatPermissions,
        type ChatPermissionRole,
        type MessagePermissions,
        type PermissionsByRole,
    } from "openchat-client";
    import GroupPermissionsPartitionViewer from "./GroupPermissionsPartitionViewer.svelte";
    import TabHeader from "../TabHeader.svelte";

    export let permissions: ChatPermissions;
    export let isPublic: boolean;

    let generalPartition: PermissionsByRole;
    let messagePartition: PermissionsByRole;
    let threadPartition: PermissionsByRole;
    let selectedTab = 0;

    $: {
        generalPartition = partitionPermissions(
            {
                changeRoles: permissions.changeRoles,
                updateGroup: permissions.updateGroup,
                inviteUsers: permissions.inviteUsers,
                removeMembers: permissions.removeMembers,
                deleteMessages: permissions.deleteMessages,
                pinMessages: permissions.pinMessages,
                reactToMessages: permissions.reactToMessages,
                mentionAllMembers: permissions.mentionAllMembers,
            },
            ""
        );
        messagePartition = partitionMessagePermissions(
            permissions.messagePermissions,
            "messagePermissions."
        );
        threadPartition = partitionMessagePermissions(
            permissions.threadPermissions ?? permissions.messagePermissions,
            "threadPermissions."
        );
    }

    type PermissionsEntry = [keyof ChatPermissions, ChatPermissionRole];

    function partitionMessagePermissions(
        mps: MessagePermissions,
        translationExt: string
    ): PermissionsByRole {
        return partitionPermissions(
            {
                text: mps.text ?? mps.default,
                image: mps.image ?? mps.default,
                video: mps.video ?? mps.default,
                audio: mps.audio ?? mps.default,
                file: mps.file ?? mps.default,
                poll: mps.poll ?? mps.default,
                crypto: mps.crypto ?? mps.default,
                giphy: mps.giphy ?? mps.default,
                prize: mps.prize ?? mps.default,
                memeFighter: mps.memeFighter ?? mps.default,
            },
            translationExt
        );
    }

    function filterPermissions([key, _]: PermissionsEntry): boolean {
        if (isPublic && key === "inviteUsers") {
            return false;
        }
        return true;
    }

    function partitionPermissions(
        permissions: Record<string, ChatPermissionRole>,
        translationExt: string
    ): PermissionsByRole {
        return (Object.entries(permissions) as PermissionsEntry[]).filter(filterPermissions).reduce(
            (dict: PermissionsByRole, [key, val]) => {
                const text = $_(
                    `permissions.${translationExt}${String(key)}`,
                    key === "mentionAllMembers" ? { values: { mention: "@everyone" } } : {}
                );

                dict[val].add(text);
                return dict;
            },
            {
                admin: new Set(),
                moderator: new Set(),
                member: new Set(),
                owner: new Set(),
                none: new Set(),
            } as PermissionsByRole
        );
    }
</script>

<TabHeader
    bind:selected={selectedTab}
    items={[$_("permissions.general"), $_("permissions.message"), $_("permissions.thread")]} />

{#if selectedTab === 0}
    <GroupPermissionsPartitionViewer partition={generalPartition} />
{:else if selectedTab === 1}
    <GroupPermissionsPartitionViewer partition={messagePartition} />
{:else if selectedTab === 2}
    <GroupPermissionsPartitionViewer partition={threadPartition} />
{/if}
