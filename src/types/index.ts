export interface ExtensionStorage {
  enabled: boolean;
  allowlist: string[];
  blockedCount: number;
  cosmeticRules: Record<string, string[]>;
  customRules: string;
}

export type RulesetId = 'ruleset-easylist' | 'ruleset-easyprivacy' | 'ruleset-ublock';

export type MessageType =
  | 'GET_STATS'
  | 'TOGGLE_ENABLED'
  | 'TOGGLE_DOMAIN'
  | 'GET_RULESET_STATUS';

export interface Message {
  type: MessageType;
  payload?: unknown;
}

export interface StatsResponse {
  blockedCount: number;
  enabled: boolean;
}

export interface RulesetStatusResponse {
  enabledRulesets: RulesetId[];
}
