<script lang="ts">
    export let logo: string;
    export let mirror: boolean = true;
    export let size: "large" | "small" | "tiny" = "large";
    export let spin = true;

    let middle = new Array(9);
</script>

<div
    class={`purse ${size}`}
    class:mirror
    style="--size: {size === 'large' ? '6rem' : size === 'small' ? '3.5rem' : '2.2rem'}">
    <div class="coin" class:spin>
        <div class:flip={!spin} class="back face">
            <div style={`background-image: url(${logo})`} class="inner" />
        </div>
        {#if spin}
            {#each middle as _}
                <div class="middle face" />
            {/each}
            <div class="front face">
                <div style={`background-image: url(${logo})`} class="inner" />
            </div>
        {/if}
    </div>
</div>

<style lang="scss">
    $padding: calc(var(--size) / 20);
    $shadow_size: calc($padding / 2);

    .purse {
        perspective: 1000;

        &.mirror {
            -webkit-box-reflect: below 0
                linear-gradient(
                    hsla(0, 0%, 100%, 0),
                    hsla(0, 0%, 100%, 0) 45%,
                    hsla(0, 0%, 100%, 0.2)
                );
        }
    }

    .coin {
        position: relative;
        transform-style: preserve-3d;
        text-align: center;

        &.spin {
            animation: spin 2.5s linear infinite;
        }
    }

    .inner {
        width: var(--size);
        height: var(--size);
        padding: $padding;
        border-radius: 50%;
        background-repeat: no-repeat;
        background-size: cover;
    }

    .face {
        padding: $padding;
        border-radius: 50%;
        background-color: hsl(42, 50%, 60%);
        border: $padding solid hsl(42, 50%, 60%);
        box-shadow: inset 0 $shadow_size $shadow_size hsl(42, 30%, 50%);
    }

    .back:not(.flip) {
        transform: scaleX(-1);
    }

    .middle {
        background-color: hsl(42, 50%, 60%);
        padding: 1px;
        border: 1px solid hsl(42, 30%, 40%);
        width: calc(var(--size) + ($padding * 4));
        height: calc(var(--size) + ($padding * 4));
        transform: translateZ(1px);
        position: absolute;
        top: 0;
    }

    .front {
        position: absolute;
        top: 0;
        transform: translateZ(10px);
    }

    @for $i from 1 through 9 {
        .middle:nth-child(#{$i}) {
            transform: translateZ(#{$i}px);
        }
    }

    @keyframes spin {
        0% {
            transform: rotateY(0deg) translateZ(-8px);
        }
        12.5% {
            transform: rotateY(45deg) translateZ(-8px);
        }
        25% {
            transform: rotateY(90deg) translateZ(-4px);
        }
        37.5% {
            transform: rotateY(135deg) translateZ(0);
        }
        50% {
            transform: rotateY(180deg) translateZ(0);
        }
        62.5% {
            transform: rotateY(225deg) translateZ(-2px);
        }
        75% {
            transform: rotateY(270deg) translateZ(-6px);
        }
        87.5% {
            transform: rotateY(315deg) translateZ(-8px);
        }
        100% {
            transform: rotateY(360deg) translateZ(-8px);
        }
    }
    // @include spinning_coin(7rem, true);
</style>
