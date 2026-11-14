export interface AgentAdapter {
  readonly name: string;
  readonly displayName: string;
  readonly description: string;
  install(projectRoot: string, dryRun?: boolean): Promise<string[]>;
  uninstall(projectRoot: string, dryRun?: boolean): Promise<string[]>;
  validate(projectRoot: string): Promise<boolean>;
}

