<script lang="ts">
    import { fade } from "svelte/transition";

    export let centered = false;
    export let fit = false;
</script>

<div
    on:contextmenu|preventDefault
    transition:fade|local={{ duration: 100 }}
    class="menu"
    class:fit
    class:centered>
    <slot />
</div>

<style lang="scss">
    .menu {
        width: toRem(250);
        background-color: var(--menu-bg);
        box-shadow: var(--menu-sh);
        border-radius: var(--rd);
        border: var(--bw) solid var(--menu-bd);
        max-height: 80vh;
        overflow-y: auto;

        @include mobile() {
            &.centered {
                width: 70vw;
            }
        }

        &.fit {
            width: fit-content;
        }
    }
</style>
