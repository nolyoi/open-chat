<script lang="ts">
    import Overlay from "../Overlay.svelte";
    import Select from "../Select.svelte";
    import ButtonGroup from "../ButtonGroup.svelte";
    import Button from "../Button.svelte";
    import Checkbox from "../Checkbox.svelte";
    import Markdown from "./Markdown.svelte";
    import Legend from "../Legend.svelte";
    import ModalContent from "../ModalContent.svelte";
    import { _ } from "svelte-i18n";
    import { iconSize } from "../../stores/iconSize";
    import { mobileWidth } from "../../stores/screenDimensions";
    import Flag from "svelte-material-icons/Flag.svelte";
    import { createEventDispatcher, getContext } from "svelte";
    import type { ChatIdentifier, OpenChat } from "openchat-client";
    import { toastStore } from "../../stores/toast";

    export let chatId: ChatIdentifier;
    export let messageId: bigint;
    export let threadRootMessageIndex: number | undefined;
    export let canDelete: boolean;

    const dispatch = createEventDispatcher();
    const client = getContext<OpenChat>("client");

    let deleteMessage = false;
    let busy = false;
    let selectedReasonIndex = -1;
    let reasons = [
        $_("report.pleaseSelect"),
        $_("report.threat"),
        $_("report.child"),
        $_("report.nonConsensual"),
        $_("report.selfHarm"),
        $_("report.violence"),
        $_("report.scam"),
    ];

    $: valid = selectedReasonIndex > -1;

    function createReport() {
        report();
        dispatch("close");
    }

    function report() {
        client
            .reportMessage(chatId, threadRootMessageIndex, messageId, canDelete && deleteMessage)
            .then((success) => {
                if (success) {
                    toastStore.showSuccessToast("report.success");
                } else {
                    toastStore.showFailureToast("report.failure");
                }
            });
    }
</script>

<Overlay on:close dismissible>
    <ModalContent on:close closeIcon>
        <span class="header" slot="header">
            <Flag size={$iconSize} color={"var(--error)"} />
            <h1>{$_("report.title")}</h1>
        </span>
        <span slot="body">
            <div class="reason">
                <Legend label={$_("report.reason")} />
                <Select bind:value={selectedReasonIndex}>
                    {#each reasons as reason, i}
                        <option disabled={i === 0} value={i - 1}>{reason}</option>
                    {/each}
                </Select>
            </div>
            {#if canDelete}
                <div class="delete">
                    <Checkbox
                        id={"delete_message"}
                        label={$_("report.deleteMessage")}
                        bind:checked={deleteMessage} />
                </div>
            {/if}
            <div class="advice">
                <Markdown
                    text={$_("report.advice", {
                        values: { rules: "https://oc.app/guidelines?section=3" },
                    })} />
            </div>
        </span>
        <span slot="footer">
            <ButtonGroup>
                <Button
                    secondary
                    small={!$mobileWidth}
                    tiny={$mobileWidth}
                    on:click={() => dispatch("close")}>{$_("cancel")}</Button>
                <Button
                    disabled={busy || !valid}
                    loading={busy}
                    small={!$mobileWidth}
                    tiny={$mobileWidth}
                    on:click={createReport}>{$_("report.menu")}</Button>
            </ButtonGroup>
        </span>
    </ModalContent>
</Overlay>

<style lang="scss">
    .header {
        display: flex;
        gap: $sp3;
        align-items: center;
    }

    .advice {
        @include font(book, normal, fs-80);
        color: var(--txt-light);
    }

    .delete {
        margin-bottom: $sp4;
    }
</style>
