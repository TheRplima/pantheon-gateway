#!/usr/bin/env python3
"""
Pantheon v2.5 Sovereign — Technical Enforcement Gate
Validates LOCKS and SIGNATURES within a Task Container.
"""
import sys
import os
import json
import hashlib
import argparse
from datetime import datetime, timezone

def calculate_hash(file_path):
    sha256_hash = hashlib.sha256()
    if not os.path.exists(file_path):
        return None
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def report_failure(container_path, target_scope, reason):
    """
    Records a gate violation in evidence and attempts to fail the task in STATE.json
    """
    container = os.path.abspath(container_path)
    evidence_path = os.path.join(container, "20_execution", "evidence.md")
    state_path = os.path.join(container, "STATE.json")
    
    timestamp = datetime.now(timezone.utc).isoformat() + "Z"
    
    # 1. Log to evidence
    try:
        os.makedirs(os.path.dirname(evidence_path), exist_ok=True)
        with open(evidence_path, 'a') as f:
            f.write(f"\n\n### [GATE_VIOLATION] {timestamp}\n")
            f.write(f"- **Attempted Action**: {target_scope}\n")
            f.write(f"- **Reason**: {reason}\n")
            f.write("- **Result**: Execution aborted by Sovereign Enforcement Gate.\n")
    except Exception as e:
        print(f"[GATE_ERROR] Failed to write evidence: {e}")

    # 2. Transition State to failed
    if os.path.exists(state_path):
        try:
            with open(state_path, 'r') as f:
                state_data = json.load(f)
            
            state_data["current_state"] = "failed"
            state_data["failure_reason"] = "gate_violation"
            state_data["violation_details"] = {
                "scope": target_scope,
                "timestamp": timestamp,
                "error": reason
            }
            
            with open(state_path, 'w') as f:
                json.dump(state_data, f, indent=2)
        except Exception as e:
             print(f"[GATE_ERROR] Failed to update STATE.json: {e}")

def validate_gate(task_container_path, target_scope, auto_report=True):
    """
    Validates if a target_scope (plan or execution) is authorized.
    Checks for LOCKS/<scope>.required and SIGNATURES/<scope>.approved.sig
    """
    container = os.path.abspath(task_container_path)
    state_path = os.path.join(container, "STATE.json")
    
    if not os.path.exists(state_path):
        # We can't even report failure if there's no container
        print(f"[GATE_FATAL] STATE.json missing in {container}")
        return False

    # Load state for metadata check
    try:
        with open(state_path, 'r') as f:
            state_data = json.load(f)
            task_id = state_data.get("task_id")
            # If already failed, don't proceed
            if state_data.get("current_state") == "failed":
                print(f"[GATE_DENIED] Task is already in 'failed' state.")
                return False
            
            # Phase C: State authority
            req_plan = state_data.get("requires_plan_approval", False)
            req_exec = state_data.get("requires_exec_approval", False)
    except Exception as e:
        print(f"[GATE_FATAL] Failed to read STATE.json: {e}")
        return False

    # Phase B: Canonical Vocabulary
    # Canonical: exec, Alias: execution
    if target_scope == "execution":
        target_scope = "exec"
    
    if target_scope not in ["plan", "exec"]:
         print(f"[GATE_ERROR] Unknown scope '{target_scope}'. Must be 'plan' or 'exec'.")
         return False

    # 2. Check for Approval Requirement or Signature/Lock
    lock_name = f"{target_scope}.required"
    sig_name = f"{target_scope}.approved.sig"
    
    lock_path = os.path.join(container, "LOCKS", lock_name)
    sig_path = os.path.join(container, "SIGNATURES", sig_name)

    is_required = False
    if target_scope == "plan" and req_plan: is_required = True
    if target_scope == "exec" and req_exec: is_required = True
    if os.path.exists(lock_path): is_required = True

    reason = None
    # If forced by STATE or LOCKED by file, we MUST have a signature
    if is_required or os.path.exists(sig_path):
        if not os.path.exists(sig_path):
            reason = f"Action '{target_scope}' requires authorization but no SIGNATURE found."
        else:
            # 3. Validate Signature Metadata
            try:
                with open(sig_path, 'r') as f:
                    content = f.read().strip()
                    try:
                        sig_data = json.loads(content)
                    except json.JSONDecodeError:
                        sig_data = {"hash": content, "scope": target_scope, "task_id": task_id}
                
                # v2.5 Metadata Validation
                sig_task_id = sig_data.get("task_id")
                sig_scope = sig_data.get("scope")
                # Handle execution alias in signature file too
                if sig_scope == "execution": sig_scope = "exec"
                
                sig_hash = sig_data.get("hash") or sig_data.get("state_hash")
                
                if sig_task_id and sig_task_id != task_id:
                    reason = f"task_id mismatch. Sig: {sig_task_id}, State: {task_id}"
                elif sig_scope and sig_scope != target_scope:
                    reason = f"Scope mismatch. Sig: {sig_scope}, Requested: {target_scope}"
                else:
                    # 4. Hash Validation
                    target_for_hash = state_path if target_scope == "exec" else os.path.join(container, "10_plan.md")
                    current_hash = calculate_hash(target_for_hash)
                    
                    if sig_hash != current_hash:
                        reason = f"Hash mismatch for '{target_scope}'. State has drifted."
            except Exception as e:
                reason = f"Signature validation error: {str(e)}"

    if reason:
        print(f"[GATE_DENIED] {reason}")
        if auto_report:
            report_failure(container, target_scope, reason)
        return False
        
    print(f"[GATE_PASS] Authorization confirmed for '{target_scope}' in {container}")
    return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pantheon Sovereign Enforcement Gate")
    parser.add_argument("--container", required=True, help="Path to Task Container")
    parser.add_argument("--verify", required=True, help="Tool or step name to verify (e.g. 'plan', 'exec')")
    parser.add_argument("--no-report", action="store_true", help="Do not log failure to evidence")
    
    args = parser.parse_args()
    
    # Map verification string to scope
    verify_scope = args.verify
    if verify_scope == "execution": verify_scope = "exec"
    
    if validate_gate(args.container, verify_scope, auto_report=not args.no_report):
        sys.exit(0)
    else:
        sys.exit(1)
