<script lang="ts">
    import { _ } from "svelte-i18n";
    import { getContext } from "svelte";
    import type { CommunitySummary, OpenChat } from "openchat-client";
    import Legend from "../../Legend.svelte";
    import DisplayNameInput from "../../DisplayNameInput.svelte";
    import ErrorMessage from "../../ErrorMessage.svelte";
    import { toastStore } from "../../../stores/toast";
    import Button from "../../Button.svelte";

    const client = getContext<OpenChat>("client");

    export let community: CommunitySummary;

    let displayName: string | undefined = undefined;
    let displayNameValid = false;
    let displayNameError: string | undefined = undefined;
    let saving = false;

    $: originalDisplayName = community.membership.displayName;
    $: displayNameDirty = displayName !== originalDisplayName;
    $: buttonEnabled = displayNameValid && displayNameDirty && !saving;

    $: {
        displayName = originalDisplayName;
        displayNameError = undefined;
    }

    function saveUser() {
        saving = true;

        client
            .setMemberDisplayName(community.id, displayName)
            .then((resp) => {
                if (resp !== "success") {
                    if (resp === "display_name_too_short") {
                        displayNameError = "register.displayNameTooShort";
                    } else if (resp === "display_name_too_long") {
                        displayNameError = "register.displayNameTooLong";
                    } else if (resp === "display_name_invalid") {
                        displayNameError = "register.displayNameInvalid";
                    } else {
                        displayNameError = "unexpectedError";
                    }
                }
            })
            .catch((err) => {
                toastStore.showFailureToast($_("unableToSaveUserProfile"));
                client.logError("Unable to save display name: ", err);
            })
            .finally(() => {
                saving = false;
            });
    }
</script>

<form class="form" on:submit|preventDefault={saveUser}>
    <div class="form-fields">
        <Legend label={$_("displayName")} rules={$_("communityDisplayNameRules")} />
        <DisplayNameInput
            {client}
            {originalDisplayName}
            disabled={false}
            bind:displayName
            bind:displayNameValid>
            {#if displayNameError !== undefined}
                <ErrorMessage>{$_(displayNameError)}</ErrorMessage>
            {/if}
        </DisplayNameInput>
    </div>
    <div class="cta">
        <Button square fill loading={saving} disabled={!buttonEnabled}>{$_("update")}</Button>
    </div>
</form>

<style lang="scss">
    .form {
        display: flex;
        flex-direction: column;
        height: 100%;
        justify-content: space-between;
    }

    .form-fields {
        padding: 0 $sp5 $sp3 $sp5;
        @include mobile() {
            padding: 0 $sp4 $sp3 $sp4;
        }
    }
    .cta {
        flex: 0 0 toRem(60);
    }
</style>
