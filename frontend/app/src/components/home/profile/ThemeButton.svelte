<script lang="ts">
    import { _ } from "svelte-i18n";
    import ChevronDown from "svelte-material-icons/ChevronDown.svelte";
    import Legend from "../../Legend.svelte";
    import MenuIcon from "../../MenuIcon.svelte";
    import Menu from "../../Menu.svelte";
    import MenuItem from "../../MenuItem.svelte";
    import { iconSize } from "../../../stores/iconSize";
    import { AvatarSize, OpenChat } from "openchat-client";
    import Avatar from "../../Avatar.svelte";
    import type { Theme } from "../../../theme/types";
    import { createEventDispatcher, getContext } from "svelte";
    import type { Alignment } from "../../../utils/alignment";

    const dispatch = createEventDispatcher();
    const client = getContext<OpenChat>("client");

    export let theme: Theme;
    export let otherThemes: Theme[];
    export let label: string;
    export let align: Alignment;

    $: userStore = client.userStore;

    function onSelect(name: string) {
        dispatch("select", name);
    }
</script>

<div class="theme-wrapper">
    <Legend {label} />
    <MenuIcon gutter={0} position="bottom" {align}>
        <div
            tabindex="0"
            role="button"
            slot="icon"
            class="theme"
            style={`background: ${theme.bg}; border-color: ${theme.accent}`}>
            <div style={`color: ${theme.txt}`} class="theme-txt">
                {theme.label}
            </div>

            <div class="icon">
                <ChevronDown viewBox={"0 -3 24 24"} size={$iconSize} color={`${theme.accent}`} />
            </div>
        </div>
        <span slot="menu">
            <Menu>
                {#each otherThemes.sort() as theme}
                    <MenuItem on:click={() => onSelect(theme.name)}>
                        <div class="theme-item" slot="text">
                            <div class="label">{theme.label}</div>
                            {#if theme.author !== undefined && $userStore[theme.author] !== undefined}
                                <div class="avatar">
                                    <Avatar
                                        url={client.userAvatarUrl($userStore[theme.author])}
                                        userId={theme.author}
                                        size={AvatarSize.Tiny} />
                                </div>
                            {/if}
                        </div>
                    </MenuItem>
                {/each}
            </Menu>
        </span>
    </MenuIcon>
</div>

<style lang="scss">
    .theme-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: $sp3;
        width: 100%;
    }

    .theme-txt {
        @include ellipsis();
    }

    .icon {
        flex: 0 0 24px;
    }

    .theme-wrapper {
        flex: 1;
    }

    .theme {
        text-align: center;
        padding: 36px 22px;
        height: 65px;
        color: #fff;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: $sp2;
        border-bottom: $sp2 solid var(--accent);

        @include mobile() {
            padding: 12px;
        }
    }
</style>
