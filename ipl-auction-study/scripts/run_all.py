"""
run_all.py - Master script that runs steps 1-6 in order.
"""
import os
import sys
import subprocess
import time

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))

steps = [
    ("Step 1 - Create Awards CSV",            "step1_create_awards.py"),
    ("Step 2 - Inspect Raw Data & Col Map",   "step2_inspect.py"),
    ("Step 3 - Aggregate Batting & Bowling",  "step3_aggregate.py"),
    ("Step 4 - Join & Flag Awards",           "step4_join_and_flags.py"),
    ("Step 5 - Compute Value Scores",         "step5_value_score.py"),
    ("Step 6 - Visualise & Report",           "step6_visualize.py"),
]

def main():
    # Prevent UnicodeEncodeError on Windows terminals with non-UTF encodings.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(errors="replace")

    print("=" * 70)
    print("  IPL AUCTION STUDY - RUNNING ALL STEPS")
    print("=" * 70)

    overall_start = time.time()

    for i, (label, script) in enumerate(steps, 1):
        script_path = os.path.join(SCRIPTS_DIR, script)
        print(f"\n{'-'*70}")
        print(f"  [{i}/{len(steps)}] {label}")
        print(f"  Script: {script}")
        print(f"{'-'*70}\n")

        start = time.time()
        child_env = os.environ.copy()
        child_env["PYTHONIOENCODING"] = "utf-8:replace"
        child_env["PYTHONUTF8"] = "1"
        result = subprocess.run(
            [sys.executable, script_path],
            cwd=SCRIPTS_DIR,
            capture_output=False,
            env=child_env,
        )
        elapsed = time.time() - start

        if result.returncode != 0:
            print(f"\n[FAILED] {label} (exit code {result.returncode})")
            print(f"   Aborting pipeline.")
            sys.exit(1)

        print(f"\n  [OK] {label} completed in {elapsed:.1f}s")

    total = time.time() - overall_start
    print(f"\n{'='*70}")
    print(f"  ALL STEPS COMPLETE - Total time: {total:.1f}s")
    print(f"{'='*70}")


if __name__ == "__main__":
    main()
