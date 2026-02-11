import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type { AgentCreateRequestedEnvelope } from "./agent-create-requested.js";

const BOOTSTRAP_FILES = [
  "AGENTS.md",
  "SOUL.md",
  "TOOLS.md",
  "IDENTITY.md",
  "USER.md",
  "HEARTBEAT.md",
  "BOOTSTRAP.md",
] as const;

type BootstrapFileName = (typeof BOOTSTRAP_FILES)[number];

type ModelDefinition = {
  model_version?: string;
  identity?: {
    name?: string;
    emoji?: string;
    creature?: string;
    vibe?: string;
    avatar?: string;
  };
  soul?: {
    purpose?: string;
    principles?: string[];
  };
  governance?: {
    allowed?: string[];
    prohibited?: string[];
    domain_rules?: string;
    red_flags?: string[];
    quality_standards?: string[];
  };
  decision?: {
    rules?: string;
    gates?: string;
    schema?: string;
    registry_list?: string;
    state_rows?: string;
    manifest?: string[];
  };
};

export type WorkspaceProvisionResult = {
  templateChecksum: string;
  modelChecksum: string;
  workspaceExists: boolean;
  bootstrapFilesPresent: BootstrapFileName[];
};

function sha256(buffer: Buffer | string): string {
  return `sha256:${crypto.createHash("sha256").update(buffer).digest("hex")}`;
}

function relativePosix(from: string, to: string): string {
  return path.relative(from, to).split(path.sep).join("/");
}

function computeDirectoryChecksum(rootDir: string): string {
  const hash = crypto.createHash("sha256");

  function visit(dir: string): void {
    const entries = fs
      .readdirSync(dir, { withFileTypes: true })
      .toSorted((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = relativePosix(rootDir, fullPath);

      if (entry.isSymbolicLink()) {
        const linkTarget = fs.readlinkSync(fullPath);
        hash.update(`L:${relPath}->${linkTarget}\n`);
        continue;
      }

      if (entry.isDirectory()) {
        hash.update(`D:${relPath}\n`);
        visit(fullPath);
        continue;
      }

      if (entry.isFile()) {
        hash.update(`F:${relPath}\n`);
        hash.update(fs.readFileSync(fullPath));
      }
    }
  }

  visit(rootDir);
  return `sha256:${hash.digest("hex")}`;
}

function readModel(params: {
  agentType: AgentCreateRequestedEnvelope["payload"]["agent_type"];
  modelKey: string;
}): { model: ModelDefinition; sourcePath: string; raw: string } {
  const typeDir = params.agentType.toLowerCase();
  const candidates = [
    path.resolve(process.cwd(), `skills/agent-factory/models/${typeDir}/${params.modelKey}.yaml`),
    path.resolve(process.cwd(), `skills/agent-factory/models/${typeDir}/${params.modelKey}`),
  ];

  const sourcePath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!sourcePath) {
    throw new Error(
      `agent model not found for type=${params.agentType} key=${params.modelKey} under skills/agent-factory/models/${typeDir}`,
    );
  }

  const raw = fs.readFileSync(sourcePath, "utf8");
  const model = YAML.parse(raw) as ModelDefinition;
  return { model, sourcePath, raw };
}

function formatBulletList(items: string[] | undefined): string {
  if (!items || items.length === 0) {
    return "";
  }
  return items.map((item) => `- ${item}`).join("\n");
}

function formatNumberedPrinciples(items: string[] | undefined): string {
  if (!items || items.length === 0) {
    return "";
  }
  return items.map((item, index) => `${index + 1}. **${item}**`).join("\n");
}

function buildTemplateVariables(
  envelope: AgentCreateRequestedEnvelope,
  model: ModelDefinition,
): Record<string, string> {
  const now = new Date();
  const dayStamp = now.toISOString().slice(0, 10);
  const timeStamp = now.toISOString().replace("T", " ").replace(".000Z", " UTC");

  return {
    AGENT_NAME: model.identity?.name ?? envelope.payload.agent_name,
    AGENT_EMOJI: model.identity?.emoji ?? "🤖",
    AGENT_CREATURE: model.identity?.creature ?? "AI agent",
    AGENT_VIBE: model.identity?.vibe ?? "",
    AGENT_AVATAR: model.identity?.avatar ?? "",
    AGENT_TYPE: envelope.payload.agent_type,
    AGENT_DOMAIN: envelope.payload.domain,
    AGENT_PURPOSE: model.soul?.purpose ?? "",
    AGENT_PRINCIPLES: formatNumberedPrinciples(model.soul?.principles),
    AGENT_ROLE_BOUNDARIES: "",
    AGENT_RULES: model.decision?.rules ?? "",
    AGENT_GATES: model.decision?.gates ?? "",
    AGENT_SCHEMA: model.decision?.schema ?? "",
    AGENT_REGISTRY_LIST: model.decision?.registry_list ?? "",
    AGENT_STATE_ROWS: model.decision?.state_rows ?? "",
    SCOPE_ALLOWED: formatBulletList(model.governance?.allowed),
    SCOPE_PROHIBITED: formatBulletList(model.governance?.prohibited),
    DOMAIN_RULES: model.governance?.domain_rules ?? "",
    RED_FLAGS: formatBulletList(model.governance?.red_flags),
    QUALITY_STANDARDS: formatBulletList(model.governance?.quality_standards),
    ORCHESTRATOR_ID: envelope.payload.agent_type === "ORCHESTRATOR" ? envelope.agent_id : "nexus",
    DATE: dayStamp,
    TIME: timeStamp,
  };
}

function renderRoleBlocks(
  content: string,
  agentType: AgentCreateRequestedEnvelope["payload"]["agent_type"],
): string {
  return content.replace(
    /:::role:([A-Z,_]+)\n([\s\S]*?)\n:::/g,
    (_whole, rolesRaw: string, block: string) => {
      const allowedRoles = rolesRaw
        .split(",")
        .map((role) => role.trim())
        .filter(Boolean);

      return allowedRoles.includes(agentType) ? block : "";
    },
  );
}

function renderTemplate(
  content: string,
  vars: Record<string, string>,
  agentType: AgentCreateRequestedEnvelope["payload"]["agent_type"],
): string {
  const withRoleBlocks = renderRoleBlocks(content, agentType);
  return withRoleBlocks.replace(
    /\{\{([A-Z0-9_]+)\}\}/g,
    (_whole, varName: string) => vars[varName] ?? "",
  );
}

function ensureDirectorySkeleton(srcDir: string, dstDir: string): void {
  const stack = [srcDir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    const rel = relativePosix(srcDir, current);
    const target = rel === "" ? dstDir : path.join(dstDir, rel);
    fs.mkdirSync(target, { recursive: true });

    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        stack.push(path.join(current, entry.name));
      }
    }
  }
}

function writeRenderedTemplateFiles(params: {
  srcTemplateDir: string;
  dstWorkspaceDir: string;
  vars: Record<string, string>;
  envelope: AgentCreateRequestedEnvelope;
}): void {
  const { srcTemplateDir, dstWorkspaceDir, vars, envelope } = params;

  const stack = [srcTemplateDir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    const entries = fs
      .readdirSync(current, { withFileTypes: true })
      .toSorted((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const srcPath = path.join(current, entry.name);
      const relPath = relativePosix(srcTemplateDir, srcPath);
      const dstPath = path.join(dstWorkspaceDir, relPath);

      if (entry.isDirectory()) {
        stack.push(srcPath);
        continue;
      }

      if (entry.isSymbolicLink()) {
        const linkTarget = fs.readlinkSync(srcPath);
        fs.rmSync(dstPath, { force: true });
        fs.symlinkSync(linkTarget, dstPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      // USER.md policy: ENTRY keeps USER.md + USER_SPECIALIZATION.md; non-ENTRY gets USER_STATELESS.md as USER.md.
      if (entry.name === "USER_STATELESS.md") {
        if (envelope.payload.agent_type === "ENTRY") {
          continue;
        }
        const rendered = renderTemplate(
          fs.readFileSync(srcPath, "utf8"),
          vars,
          envelope.payload.agent_type,
        );
        fs.writeFileSync(path.join(path.dirname(dstPath), "USER.md"), rendered, "utf8");
        continue;
      }

      if (entry.name === "USER.md" && envelope.payload.agent_type !== "ENTRY") {
        continue;
      }

      if (entry.name === "USER_SPECIALIZATION.md" && envelope.payload.agent_type !== "ENTRY") {
        continue;
      }

      const rendered = renderTemplate(
        fs.readFileSync(srcPath, "utf8"),
        vars,
        envelope.payload.agent_type,
      );
      fs.writeFileSync(dstPath, rendered, "utf8");
    }
  }
}

function writeAgentVersionFile(params: {
  workspacePath: string;
  envelope: AgentCreateRequestedEnvelope;
  modelVersion: string;
}): void {
  const data = {
    template_version: params.envelope.payload.template.version,
    model: params.envelope.payload.model.key,
    model_version: params.modelVersion,
    schema_version: "2.5",
    created_at: new Date().toISOString(),
    agent_type: params.envelope.payload.agent_type,
  };

  fs.writeFileSync(
    path.join(params.workspacePath, ".agent_version.json"),
    `${JSON.stringify(data, null, 2)}\n`,
    "utf8",
  );
}

function listBootstrapFilesPresent(workspacePath: string): BootstrapFileName[] {
  const present: BootstrapFileName[] = [];
  for (const fileName of BOOTSTRAP_FILES) {
    if (fs.existsSync(path.join(workspacePath, fileName))) {
      present.push(fileName);
    }
  }
  return present;
}

export function provisionWorkspaceFromCreateRequested(
  envelope: AgentCreateRequestedEnvelope,
): WorkspaceProvisionResult {
  const templateDir = path.resolve(
    process.cwd(),
    `skills/agent-factory/template/${envelope.payload.template.version}`,
  );

  if (!fs.existsSync(templateDir) || !fs.statSync(templateDir).isDirectory()) {
    throw new Error(`agent template not found: ${templateDir}`);
  }

  const { model, raw: modelRaw } = readModel({
    agentType: envelope.payload.agent_type,
    modelKey: envelope.payload.model.key,
  });

  const workspacePath = envelope.payload.paths.current_workspace_path;
  fs.rmSync(workspacePath, { recursive: true, force: true });
  fs.mkdirSync(workspacePath, { recursive: true });

  ensureDirectorySkeleton(templateDir, workspacePath);

  const vars = buildTemplateVariables(envelope, model);
  writeRenderedTemplateFiles({
    srcTemplateDir: templateDir,
    dstWorkspaceDir: workspacePath,
    vars,
    envelope,
  });

  writeAgentVersionFile({
    workspacePath,
    envelope,
    modelVersion: model.model_version ?? envelope.payload.model.version,
  });

  return {
    templateChecksum: computeDirectoryChecksum(templateDir),
    modelChecksum: sha256(modelRaw),
    workspaceExists: fs.existsSync(workspacePath),
    bootstrapFilesPresent: listBootstrapFilesPresent(workspacePath),
  };
}
