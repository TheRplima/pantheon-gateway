#!/usr/bin/env python3
"""
Agent Factory v2.5 — Pantheon Agent Workspace Generator

Generates agent workspaces compliant with Pantheon Agent Standard v2.5
and Template Defaults v2.5.

Features:
- Model-based agent creation
- Placeholder marker processing
- Essence shielding for protected files
"""
import argparse
import json
import os
import re
import shutil
import sys
import yaml
from datetime import datetime, timezone
from pathlib import Path

def write_file(path, content, force=False):
    if os.path.exists(path) and not force:
        raise FileExistsError(f"File exists: {path}")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

def ensure_dir(path):
    os.makedirs(path, exist_ok=True)

def slugify(name):
    return name.strip().lower().replace(" ", "-")

def get_script_dir():
    return os.path.dirname(os.path.abspath(__file__))

def load_model(model_name, agent_type):
    """Load model YAML from models/{type}/{name}.yaml"""
    models_dir = os.path.join(get_script_dir(), "..", "models")
    type_dir = agent_type.lower()
    model_path = os.path.join(models_dir, type_dir, f"{model_name}.yaml")
    
    if not os.path.exists(model_path):
        return None
    
    with open(model_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def format_list(items, prefix="- "):
    """Format a list of items as markdown bullets"""
    if not items:
        return ""
    if isinstance(items, str):
        return items
    return "\n".join([f"{prefix}{item}" for item in items])

def format_principles(principles):
    """Format principles as numbered list"""
    if not principles:
        return ""
    if isinstance(principles, str):
        return principles
    return "\n".join([f"{i+1}. **{p}**" for i, p in enumerate(principles)])

def build_vars_from_model(model, args):
    """Build template variables from model + CLI args"""
    vars = {
        # From CLI args (backward compatibility)
        "NAME": args.name,
        "AGENT_ID": slugify(args.name),
        "ROLE": args.role,
        "CREATED_AT": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "TIMESTAMP": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }
    
    if model:
        # Identity from model
        identity = model.get("identity", {})
        vars.update({
            "AGENT_NAME": identity.get("name", args.name),
            "AGENT_EMOJI": identity.get("emoji", args.emoji),
            "AGENT_CREATURE": identity.get("creature", "AI agent"),
            "AGENT_VIBE": identity.get("vibe", ""),
            "AGENT_AVATAR": identity.get("avatar", ""),
            "AGENT_TYPE": model.get("type", args.role),
            "AGENT_DOMAIN": model.get("domain", args.domain or "general"),
            "ORCHESTRATOR_ID": slugify(args.name),
        })
        
        # Soul from model
        soul = model.get("soul", {})
        vars.update({
            "AGENT_PURPOSE": soul.get("purpose", ""),
            "AGENT_PRINCIPLES": format_principles(soul.get("principles", [])),
            "AGENT_ROLE_BOUNDARIES": "",  # Filled from governance
        })
        
        # Governance and Decision overrides from model
        governance = model.get("governance", {})
        decision = model.get("decision", {})
        vars.update({
            "AGENT_DOMAIN_DESCRIPTION": model.get("description", ""),
            "SCOPE_ALLOWED": format_list(governance.get("allowed", [])),
            "SCOPE_PROHIBITED": format_list(governance.get("prohibited", [])),
            "DOMAIN_RULES": governance.get("domain_rules", ""),
            "RED_FLAGS": format_list(governance.get("red_flags", [])),
            "QUALITY_STANDARDS": format_list(governance.get("quality_standards", [])),
            "AGENT_RULES": decision.get("rules", ""),
            "AGENT_GATES": decision.get("gates", ""),
            "AGENT_SCHEMA": decision.get("schema", ""),
            "AGENT_REGISTRY_LIST": decision.get("registry_list", ""),
            "AGENT_STATE_ROWS": decision.get("state_rows", ""),
            "MANIFEST": decision.get("manifest", []),
        })
        
        # Onboarding placeholders (agent fills these)
        vars.update({
            "USER_NAME": "",
            "USER_PREFERRED_NAME": "",
            "USER_TIMEZONE": "",
            "USER_LANGUAGE": "",
            "USER_PRONOUNS": "",
            "USER_WORK_HOURS": "",
            "USER_QUIET_HOURS": "",
            "USER_COMM_STYLE": "",
            "DATE": datetime.utcnow().strftime("%Y-%m-%d"),
            "TIME": datetime.utcnow().strftime("%H:%M:%S UTC"),
        })
    else:
        # Fallback to CLI args (legacy mode)
        vars.update({
            "AGENT_NAME": args.name,
            "AGENT_EMOJI": args.emoji,
            "AGENT_CREATURE": "AI agent",
            "AGENT_VIBE": args.profile,
            "AGENT_AVATAR": "",
            "AGENT_TYPE": args.role,
            "AGENT_DOMAIN": args.domain or "general",
            "ORCHESTRATOR_ID": slugify(args.name),
            "AGENT_PURPOSE": args.function,
            "AGENT_PRINCIPLES": "",
            "AGENT_ROLE_BOUNDARIES": "",
            "AGENT_DOMAIN_DESCRIPTION": "",
            "SCOPE_ALLOWED": "",
            "SCOPE_PROHIBITED": "",
            "DOMAIN_RULES": "",
            "RED_FLAGS": "",
            "QUALITY_STANDARDS": "",
            "USER_NAME": "",
            "USER_PREFERRED_NAME": "",
            "USER_TIMEZONE": "",
            "USER_LANGUAGE": "",
            "USER_PRONOUNS": "",
            "USER_WORK_HOURS": "",
            "USER_QUIET_HOURS": "",
            "USER_COMM_STYLE": "",
            "DATE": datetime.utcnow().strftime("%Y-%m-%d"),
            "TIME": datetime.utcnow().strftime("%H:%M:%S UTC"),
        })
        
        # Legacy: responsibilities
        responsibilities = [r.strip() for r in args.responsibilities.split(",") if r.strip()]
        vars["RESPONSIBILITIES"] = "\n".join([f"- {r}" for r in responsibilities])
        vars["USER"] = args.user
        vars["FUNCTION"] = args.function
        vars["PROFILE"] = args.profile
        vars["EMOJI"] = args.emoji
        vars["DOMAIN"] = args.domain or "general"
    
    return vars

def process_markers(content, vars, agent_role="SERVICE"):
    """
    Process placeholder markers in template content.
    
    Marker types:
    - :::immutable - Keep as-is (substitutes variables but preserves structure)
    - :::role:ROLE_NAME - Only keep content if agent_role matches
    - :::customizable:name - Substitute variables from model
    - :::onboarding:type - Leave placeholders for agent to fill
    - :::extensible:name - Substitute available vars, leave rest
    """
    # 1. Process Role-based blocks first
    # Format: :::role:ORCHESTRATOR\n(content)\n:::
    role_pattern = re.compile(r':::role:([A-Z]+)\n(.*?)\n:::', re.DOTALL)
    
    def role_replacer(match):
        target_role = match.group(1)
        block_content = match.group(2)
        if target_role == agent_role:
            return block_content
        return ""

    content = role_pattern.sub(role_replacer, content)

    # 2. Substitute all {{VARIABLE}} placeholders
    for k, v in vars.items():
        content = content.replace(f"{{{{{k}}}}}", str(v))
    
    return content

def main():
    p = argparse.ArgumentParser(description="Create a Pantheon agent workspace (v2.3)")
    p.add_argument("--name", required=True, help="Agent name/id")
    p.add_argument("--model", help="Model name (e.g., 'pantheon-operator', 'personal-assistant')")
    p.add_argument("--function", default="", help="Mission/primary function (legacy, use --model instead)")
    p.add_argument("--profile", default="", help="Style/persona profile (legacy, use --model instead)")
    p.add_argument("--responsibilities", default="", help="Comma-separated responsibilities (legacy)")
    p.add_argument("--user", default="System", help="Primary user description")
    p.add_argument("--emoji", default="🤖", help="Emoji for agent identity")
    p.add_argument("--role", choices=["ENTRY", "SERVICE", "ORCHESTRATOR"], default="SERVICE", help="Agent type")
    p.add_argument("--domain", default="", help="Agent domain (e.g., research, security)")
    p.add_argument("--base_dir", default="agents", help="Base directory for workspaces")
    p.add_argument("--template_version", default="v2.5", choices=["v2.0", "v2.2", "v2.3", "v2.5"], help="Template version")
    p.add_argument("--register", action="store_true", help="Create agent config.json")
    p.add_argument("--force", action="store_true", help="Overwrite existing files")
    p.add_argument("--dry-run", action="store_true", help="Show what would be created without creating")
    p.add_argument("--task-container", help="Path to active Task Container (required for enforcement)")

    args = p.parse_args()
    agent_id = slugify(args.name)
    
    # === ENFORCEMENT GATE (Sovereign v2.5) ===
    # Agent factory is a critical tool. Re-provisioning or registering requires authorization.
    if args.task_container:
        print(f"[GATE] Verifying authorization for '{agent_id}' factory call...")
        from gate import validate_gate
        if not validate_gate(args.task_container, "plan"):
             print("[FATAL] Sovereign Enforcement: Plan Authorization denied. Aborting.")
             sys.exit(1)
    else:
        # If no container is provided, we check if it's a destructive action (force or register)
        if args.force or args.register:
            print("[FATAL] Sovereign Enforcement: Critical action attempted without --task-container. Execution denied.")
            sys.exit(1)
    
    # Model-based or legacy mode
    model = None
    if args.model:
        model = load_model(args.model, args.role)
        if not model:
            print(f"[WARN] Model '{args.model}' not found for type '{args.role}', using defaults")
    elif not args.function:
        print("[ERROR] Either --model or --function is required")
        return 1
    
    # Workspace path (no more clawd- prefix when in agents/ or agents/services/)
    if args.base_dir == "agents" or args.base_dir.endswith("/agents") or "agents/services" in args.base_dir:
        workspace = os.path.join(args.base_dir, agent_id)
    else:
        workspace = os.path.join(args.base_dir, f"clawd-{agent_id}")
    
    
    # Template directory - check archive/ for legacy versions
    template_dir = os.path.join(get_script_dir(), "..", "template", args.template_version)
    
    # Legacy templates were moved to archive/
    if not os.path.exists(template_dir) and args.template_version in ["v2.0", "v2.2"]:
        template_dir = os.path.join(get_script_dir(), "..", "template", "archive", args.template_version)
    
    if not os.path.exists(template_dir):
        print(f"[ERROR] Template directory not found: {template_dir}")
        return 1

    # Build variables from model or CLI args
    vars = build_vars_from_model(model, args)

    def get_template(rel_path):
        full_path = os.path.join(template_dir, rel_path)
        if not os.path.exists(full_path):
            return None
        with open(full_path, "r", encoding="utf-8") as f:
            return process_markers(f.read(), vars, agent_role=args.role)

    # Dry run mode
    if args.dry_run:
        print(f"[DRY-RUN] Would create workspace: {workspace}")
        print(f"[DRY-RUN] Template version: {args.template_version}")
        print(f"[DRY-RUN] Agent type: {args.role}")
        if model:
            print(f"[DRY-RUN] Model: {args.model}")
            print(f"[DRY-RUN] Model version: {model.get('model_version', 'unknown')}")
        return 0

    # Check if workspace is already active (essence protection)
    workspace_active = (
        os.path.exists(os.path.join(workspace, "AGENTS.md"))
        or os.path.exists(os.path.join(workspace, "IDENTITY.md"))
    )

    # === CREATE DIRECTORY STRUCTURE (v2.3) ===
    
    # Base directories
    ensure_dir(workspace)
    
    # v2.3 directories
    dirs_v23 = [
        "governance",
        "decision", 
        "protocols",
        "protocols/evidence",
        "memory",
        "logs",
        "canvas",
        "scripts",
        "tasks/inbox",
        "tasks/active",
        "tasks/waiting",
        "tasks/done",
        "tasks/cancelled",
        "tasks/recurring",
        "tasks/templates",
        "outbox/evidence"
    ]

    # v2.5 directories (Standardized IATP Modelo C)
    dirs_v25 = [
        "governance",
        "decision",
        "protocols",
        "protocols/task_container",
        "protocols/task_container/20_execution",
        "protocols/task_container/30_delivery",
        "protocols/task_container/LOCKS",
        "protocols/task_container/SIGNATURES",
        "memory",
        "logs",
        "canvas",
        "scripts",
        "registry",
        "tasks/inbox",
        "tasks/active",
        "tasks/waiting",
        "tasks/outbox",
        "tasks/cancelled",
        "tasks/done"
    ]
    
    selected_dirs = dirs_v25 if args.template_version == "v2.5" else dirs_v23
    
    for d in selected_dirs:
        ensure_dir(os.path.join(workspace, d))

    # === PROTECTED FILES (Essence Shielding) ===
    def write_protected(rel_path, content):
        """Write file only if it doesn't exist (essence protection)"""
        if content is None:
            return
        path = os.path.join(workspace, rel_path)
        try:
            write_file(path, content, force=False)
            print(f"[CREATED] {rel_path}")
        except FileExistsError:
            print(f"[PROTECTED] Essence preserved: {rel_path}")

    # Protected files (agent essence - never overwritten)
    write_protected("SOUL.md", get_template("SOUL.md"))
    write_protected("governance/SPECIFIC_GOVERNANCE.md", get_template("governance/SPECIFIC_GOVERNANCE.md"))
    
    # === CORE FILES (Always updated) ===
    def write_core(rel_path, content):
        """Write core file (can be overwritten with --force)"""
        if content is None:
            return
        path = os.path.join(workspace, rel_path)
        try:
            write_file(path, content, force=args.force)
            print(f"[CREATED] {rel_path}")
        except FileExistsError:
            print(f"[SKIPPED] {rel_path} (use --force to overwrite)")

    # Base OpenClaw files
    write_core("IDENTITY.md", get_template("IDENTITY.md"))
    write_core("AGENTS.md", get_template("AGENTS.md"))
    write_core("TOOLS.md", get_template("TOOLS.md"))
    write_core("HEARTBEAT.md", get_template("HEARTBEAT.md"))
    
    # User Context Layer (Stateless vs Stateful)
    if args.role == "ENTRY":
        write_core("USER.md", get_template("USER.md"))
        write_core("USER_SPECIALIZATION.md", get_template("USER_SPECIALIZATION.md"))
    else:
        # Compatibility: OpenClaw requires USER.md, but we keep it stateless
        write_core("USER.md", get_template("USER_STATELESS.md"))
        print(f"[POLICY] Written minimal USER context for {args.role} (Stateless Compatibility)")
    
    # BOOTSTRAP only for new workspaces
    if not workspace_active or args.force:
        write_core("BOOTSTRAP.md", get_template("BOOTSTRAP.md"))
    
    # Governance layer
    write_core("governance/CORE_GOVERNANCE.md", get_template("governance/CORE_GOVERNANCE.md"))
    write_core("governance/DRIFT_RULES.md", get_template("governance/DRIFT_RULES.md"))
    write_core("logs/QUALITY_METRICS.md", get_template("logs/QUALITY_METRICS.md"))
    write_core("governance/FAILURE_MODES.md", get_template("governance/FAILURE_MODES.md"))
    write_core("governance/INTER_AGENT_TASK_PROTOCOL.md", get_template("governance/INTER_AGENT_TASK_PROTOCOL.md"))
    write_core("governance/SECURITY_POLICY.md", get_template("governance/SECURITY_POLICY.md"))
    
    # Decision layer
    write_core("decision/inputs.schema.yaml", get_template("decision/inputs.schema.yaml"))
    write_core("decision/gates.yaml", get_template("decision/gates.yaml"))
    write_core("decision/rules.yaml", get_template("decision/rules.yaml"))
    write_core("logs/decision_log.md", get_template("logs/decision_log.md"))

    # Manifest (dynamic artifacts from model)
    manifest = vars.get("MANIFEST", [])
    if manifest:
        print(f"[MANIFEST] Processing {len(manifest)} extra artifacts...")
        for rel_path in manifest:
            write_core(rel_path, get_template(rel_path))
    
    # Protocol layer
    if args.template_version == "v2.5":
        write_core("protocols/task_container/STATE.json", get_template("protocols/task_container/STATE.json"))
        write_core("protocols/task_container/00_brief.md", get_template("protocols/task_container/00_brief.md"))
        write_core("protocols/task_container/10_plan.md", get_template("protocols/task_container/10_plan.md"))
        write_core("protocols/task_container/30_report.md", get_template("protocols/task_container/30_report.md"))
        write_core("protocols/task_container/20_execution/evidence.md", get_template("protocols/task_container/20_execution/evidence.md"))
        write_core("protocols/task_container/20_execution/notes.md", get_template("protocols/task_container/20_execution/notes.md"))
        write_core("protocols/task_container/30_delivery/.keep", get_template("protocols/task_container/30_delivery/.keep"))
    else:
        write_core("protocols/BRIEF.md", get_template("protocols/BRIEF.md"))
        write_core("protocols/PLAN.md", get_template("protocols/PLAN.md"))
        write_core("protocols/REPORT.md", get_template("protocols/REPORT.md"))
    
    # Create .keep files for empty directories
    for d in selected_dirs:
        # Skip top level directories that might have files
        if d in ["governance", "decision", "protocols"]:
            continue
        keep_path = os.path.join(workspace, d, ".keep")
        if not os.path.exists(keep_path):
            write_file(keep_path, "", force=True)

    # === WRITE VERSION INFO ===
    version_info = {
        "template_version": args.template_version,
        "model": args.model or None,
        "model_version": model.get("model_version") if model else None,
        "schema_version": model.get("schema_version") if model else None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "agent_type": args.role,
    }
    version_path = os.path.join(workspace, ".agent_version.json")
    write_file(version_path, json.dumps(version_info, indent=2) + "\n", force=True)
    print(f"[CREATED] .agent_version.json")

    # === OPTIONAL: Registration ===
    if args.register:
        # Canonical path: configs/registry/<agent_id>/config.json
        agents_state_dir = os.path.join(get_script_dir(), "..", "..", "..", "registry", agent_id)
        os.makedirs(agents_state_dir, exist_ok=True)
        
        config = {
            "id": agent_id,
            "name": args.name,
            "type": args.role,
            "domain": args.domain or "general",
            "workspace": workspace,
            "template_version": args.template_version,
            "model": args.model,
            "createdAt": datetime.utcnow().isoformat() + "Z"
        }
        config_path = os.path.join(agents_state_dir, "config.json")
        write_file(config_path, json.dumps(config, indent=2) + "\n", force=args.force)
        print(f"[REGISTERED] {config_path}")

    # === CREATE RE-RUN SCRIPT ===
    script_path = os.path.join(workspace, f"create-{agent_id}.sh")
    model_arg = f"--model {args.model!r}" if args.model else ""
    function_arg = f"--function {args.function!r}" if args.function else ""
    script = textwrap.dedent(f"""\
    #!/usr/bin/env bash
    set -euo pipefail
    python3 {os.path.abspath(os.path.join(get_script_dir(), 'agent_factory.py'))} \\
      --name {args.name!r} \\
      --role {args.role!r} \\
      {model_arg} \\
      {function_arg} \\
      --domain {(args.domain or 'general')!r} \\
      --template_version {args.template_version!r} \\
      --base_dir {args.base_dir!r} \\
      {"--register" if args.register else ""} \\
      {"--force" if args.force else ""}
    """)
    write_file(script_path, script, force=True)
    os.chmod(script_path, 0o755)

    print(f"\n[OK] Workspace created: {workspace}")
    print(f"[OK] Template version: {args.template_version}")
    print(f"[OK] Agent type: {args.role}")
    if model:
        print(f"[OK] Model: {args.model} (v{model.get('model_version', 'unknown')})")
    print(f"[OK] Re-run script: {script_path}")

if __name__ == "__main__":
    main()
