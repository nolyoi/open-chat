import type { Logger } from "openchat-shared";
import type { MessageFormatter } from "./utils/i18n";

export type OpenChatConfig = {
    icUrl?: string;
    iiDerivationOrigin?: string;
    openStorageIndexCanister: string;
    groupIndexCanister: string;
    notificationsCanister: string;
    onlineCanister: string;
    userIndexCanister: string;
    registryCanister: string;
    internetIdentityUrl: string;
    nfidUrl: string;
    userGeekApiKey: string;
    meteredApiKey: string;
    enableMultiCrypto?: boolean;
    blobUrlPattern: string;
    proposalBotCanister: string;
    marketMakerCanister: string;
    i18nFormatter: MessageFormatter;
    logger: Logger;
    websiteVersion: string;
    rollbarApiKey: string;
    env: string;
};
