<script lang="ts">
    import { getContext, onMount } from "svelte";
    import { type OpenChat } from "openchat-client";
    import Alert from "svelte-material-icons/Alert.svelte";
    import { iconSize } from "../../stores/iconSize";
    import { _ } from "svelte-i18n";
    import Legend from "../Legend.svelte";

    const client = getContext<OpenChat>("client");

    export let amount: bigint = BigInt(0);
    export let autofocus: boolean = false;
    export let minAmount: bigint = BigInt(0);
    export let maxAmount: bigint;
    export let ledger: string;
    export let valid: boolean = false;
    export let state: "ok" | "zero" | "too_low" | "too_high" = "zero";
    export let label: string = "tokenTransfer.amount";
    export let transferFees: bigint;

    let inputElement: HTMLInputElement;

    $: cryptoLookup = client.cryptoLookup;
    $: tokenDetails = $cryptoLookup[ledger];
    $: symbol = tokenDetails.symbol;
    $: tokenDecimals = tokenDetails.decimals;

    onMount(() => {
        if (amount > BigInt(0)) {
            inputElement.value = client.formatTokens(amount, 0, tokenDecimals, ".");
        }
    });

    $: {
        if (inputElement !== undefined) {
            const validateResult = client.validateTokenInput(inputElement.value, tokenDecimals);
            if (validateResult.amount !== amount) {
                inputElement.value = client.formatTokens(amount, 0, tokenDecimals, ".");
            }
            validate();
        }
    }

    $: {
        // Re-validate whenever minAmount or maxAmount changes
        if (minAmount || maxAmount) {
        }
        validate();
    }

    function onKeyup() {
        const inputAmount = Math.round(Number(inputElement.value) * Math.pow(10, tokenDecimals));
        if (!isNaN(inputAmount)) {
            amount = BigInt(inputAmount);
        }
    }

    function max() {
        amount = maxAmount;
        validate();
    }

    function validate() {
        if (amount === BigInt(0)) {
            state = "zero";
        } else if (amount < minAmount) {
            state = "too_low";
        } else if (amount > maxAmount) {
            state = "too_high";
        } else {
            state = "ok";
        }
        valid = state === "ok";
    }
</script>

<div class="label">
    <Legend label={$_(label)} rules={symbol} />
    <div on:click={max} class="max">{$_("tokenTransfer.max")}</div>
</div>
<div class="wrapper">
    <div class="fee">
        <Alert size={$iconSize} color={"var(--warn)"} />
        <span>
            {$_("tokenTransfer.fee", {
                values: {
                    fee: client.formatTokens(transferFees, 0, tokenDecimals),
                    token: symbol,
                },
            })}
        </span>
    </div>
    <input
        {autofocus}
        class="amount-val"
        min={Number(maxAmount) / Math.pow(10, tokenDecimals)}
        max={Number(maxAmount) / Math.pow(10, tokenDecimals)}
        type="number"
        step="0.00000001"
        bind:this={inputElement}
        on:keyup={onKeyup}
        placeholder="0" />
</div>

<style lang="scss">
    .wrapper {
        position: relative;
    }

    .label {
        display: flex;
        align-items: center;
        gap: $sp3;

        .max {
            transition: background ease-in-out 200ms;
            background: var(--button-bg);
            color: var(--button-txt);
            padding: 0 $sp3;
            border-radius: var(--rd);
            cursor: pointer;
            border: none;
            @include font(book, normal, fs-50, 20);

            @media (hover: hover) {
                &:hover {
                    background: var(--button-hv);
                }
            }
        }
    }

    .amount-val {
        width: 100%;
        display: block;
        text-align: start;

        @include input();

        &::placeholder {
            color: var(--placeholder);
        }
    }

    .fee {
        position: absolute;
        right: $sp3;
        top: 12px;
        display: flex;
        gap: $sp3;
        align-items: center;
        @include font(book, normal, fs-60);
    }

    /* Chrome, Safari, Edge, Opera */
    input::-webkit-outer-spin-button,
    input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    /* Firefox */
    input[type="number"] {
        -moz-appearance: textfield;
    }
</style>
