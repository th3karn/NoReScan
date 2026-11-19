import crypto from 'node:crypto';
import {
  Organization,
  OrganizationMember,
  OrgRole,
  PlanTier,
  defaultLogger,
} from '@norescan/shared';

const ROLE_HIERARCHY: Record<OrgRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  read_only: 1,
};

export class TeamWorkspaceManager {
  private organizations: Map<string, Organization> = new Map();
  private members: Map<string, OrganizationMember[]> = new Map(); // key = orgId

  /**
   * Creates a new Team / Agency organization.
   */
  public createOrganization(name: string, ownerId: string, plan: PlanTier = 'team', seats = 5): Organization {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const org: Organization = {
      id: `org_${crypto.randomUUID().slice(0, 8)}`,
      name,
      slug,
      ownerId,
      plan,
      seatsAllocated: seats,
      createdAt: new Date().toISOString(),
    };

    this.organizations.set(org.id, org);

    // Add owner as first member
    const ownerMember: OrganizationMember = {
      orgId: org.id,
      userId: ownerId,
      email: `${ownerId}@org.local`,
      role: 'owner',
      status: 'active',
      joinedAt: new Date().toISOString(),
    };
    this.members.set(org.id, [ownerMember]);

    defaultLogger.info(`Created organization ${org.name} (${org.id}) with ${seats} seats.`);
    return org;
  }

  public getOrganization(orgId: string): Organization | undefined {
    return this.organizations.get(orgId);
  }

  public listOrganizations(): Organization[] {
    return Array.from(this.organizations.values());
  }

  /**
   * Invites a new developer into the team organization workspace.
   */
  public inviteMember(orgId: string, email: string, role: OrgRole = 'member'): OrganizationMember {
    const org = this.getOrganization(orgId);
    if (!org) throw new Error(`Organization ${orgId} not found.`);

    const currentMembers = this.members.get(orgId) || [];
    if (currentMembers.length >= org.seatsAllocated) {
      throw new Error(`Seat limit reached (${org.seatsAllocated} seats). Please upgrade or add seats to invite ${email}.`);
    }

    if (currentMembers.some((m) => m.email === email)) {
      throw new Error(`Member with email ${email} is already part of organization ${org.name}.`);
    }

    const newMember: OrganizationMember = {
      orgId,
      userId: `usr_${crypto.createHash('md5').update(email).digest('hex').slice(0, 8)}`,
      email,
      role,
      status: 'invited',
      joinedAt: new Date().toISOString(),
    };

    currentMembers.push(newMember);
    this.members.set(orgId, currentMembers);
    defaultLogger.info(`Invited ${email} [role: ${role}] to ${org.name}`);
    return newMember;
  }

  public listMembers(orgId: string): OrganizationMember[] {
    return this.members.get(orgId) || [];
  }

  public updateMemberRole(orgId: string, email: string, newRole: OrgRole): boolean {
    const currentMembers = this.members.get(orgId) || [];
    const member = currentMembers.find((m) => m.email === email);
    if (!member) return false;
    if (member.role === 'owner') {
      throw new Error('Cannot change the role of the organization owner.');
    }
    member.role = newRole;
    return true;
  }

  public removeMember(orgId: string, email: string): boolean {
    const currentMembers = this.members.get(orgId) || [];
    const idx = currentMembers.findIndex((m) => m.email === email);
    if (idx === -1) return false;
    if (currentMembers[idx].role === 'owner') {
      throw new Error('Cannot remove the organization owner.');
    }
    currentMembers.splice(idx, 1);
    this.members.set(orgId, currentMembers);
    return true;
  }

  /**
   * Verifies if a member role meets or exceeds the required role in the hierarchy.
   */
  public verifyPermission(memberRole: OrgRole, requiredRole: OrgRole): boolean {
    return ROLE_HIERARCHY[memberRole] >= ROLE_HIERARCHY[requiredRole];
  }

  /**
   * Generates centralized agent configuration templates (.cursorrules and AGENTS.md) for the team.
   */
  public generateTeamAgentConfig(org: Organization): { cursorRules: string; agentsMd: string } {
    const cursorRules = `# Team Rules for ${org.name}
# Managed by NoReScan Cloud Team Infrastructure (Org ID: ${org.id})
- Always query NoReScan memory before scanning the repository: run "norescan context <task>"
- Use "norescan remember <file>" immediately after creating or modifying source code
- Respect shared team architectural decisions (ADRs) recorded in NoReScan
`;

    const agentsMd = `# ${org.name} — Coding Agent Workspace Instructions
<!-- norescan:TEAM:START -->
Organization: ${org.name} (${org.id})
Plan: ${org.plan.toUpperCase()} (Shared Team Memory)

1. Before coding tasks: Retrieve task context using MCP "get_task_context" or "norescan context"
2. When creating files: Call "remember_file(path)" or "norescan remember <path>"
3. When tests fail: Call "diagnose_and_fix(autoFix: true)" or "norescan fix"
4. Architectural decisions: Record technical consensus using "record_decision"
<!-- norescan:TEAM:END -->
`;

    return { cursorRules, agentsMd };
  }
}
