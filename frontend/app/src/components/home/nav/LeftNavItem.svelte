<script lang="ts">
    import { emptyUnreadCounts } from "openchat-client";
    import UnreadCount from "../UnreadCount.svelte";

    export let label: string;
    export let selected: boolean = false;
    export let separator: boolean = false;
    export let unread = emptyUnreadCounts();
    export let disabled = false;
</script>

<div role="button" tabindex="0" class:separator class:selected class="left-nav-item" on:click>
    <div class="icon" title={label}>
        <slot />
        <UnreadCount {unread} />
    </div>
    <div class="label">{label}</div>
    <div class="menu"><slot name="menu" /></div>
</div>

<style lang="scss">
    :global(.left-nav-item .unread-count) {
        right: toRem(-9);
        top: 85%;
        @include mobile() {
            right: toRem(-5);
        }
    }

    $size: toRem(48);
    $mobile-size: toRem(40);

    .left-nav-item {
        display: flex;
        align-items: center;
        gap: toRem(16);
        padding: toRem(8) toRem(16);
        cursor: pointer;

        @include mobile() {
            padding: toRem(6) toRem(10);
        }

        @media (hover: hover) {
            &:hover {
                background-color: var(--chatSummary-hv);
            }
        }

        &.selected {
            background-color: var(--chatSummary-bg-selected);
        }

        &.separator {
            border-bottom: 1px solid var(--bd);
        }

        .icon {
            flex: 0 0 $size;
            width: $size;
            height: $size;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;

            @include mobile() {
                flex: 0 0 $mobile-size;
                width: $mobile-size;
                height: $mobile-size;
            }
        }

        .label {
            flex: auto;
            white-space: nowrap;
        }

        .menu {
            flex: 0 0 toRem(30);
        }
    }
</style>
