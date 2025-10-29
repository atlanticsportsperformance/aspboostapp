#!/usr/bin/env python3
"""
Remove duplicate Athlete Profile card and Login Account section from Overview tab
"""

file_path = r"C:\Users\Owner\Desktop\completeapp\components\dashboard\athletes\athlete-overview-tab.tsx"

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find and remove the duplicate Athlete Profile card (starts at line 898, ends at line 1267)
# We need to find the section that starts with "Combined Profile & Contact Card"
# and ends before "Main Content Grid"

new_lines = []
skip = False
skip_start_marker = "Combined Profile & Contact Card"
skip_end_marker = "Main Content Grid"

for i, line in enumerate(lines):
    if skip_start_marker in line:
        skip = True
        print(f"Starting skip at line {i+1}")
        continue

    if skip and skip_end_marker in line:
        skip = False
        print(f"Ending skip at line {i+1}")
        # Keep the Main Content Grid line
        new_lines.append(line)
        continue

    if not skip:
        new_lines.append(line)

# Now remove the AthleteAccountSection from the Main Content Grid
final_lines = []
skip_account = False
account_start = "Login Account Management"
account_end_marker = "Recent Activity Feed"

for i, line in enumerate(new_lines):
    if account_start in line:
        skip_account = True
        print(f"Removing Login Account section starting at line {i+1}")
        continue

    if skip_account and account_end_marker in line:
        skip_account = False
        print(f"Stopped skipping at line {i+1}")
        # Keep the Recent Activity line
        final_lines.append(line)
        continue

    if not skip_account:
        final_lines.append(line)

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(final_lines)

print(f"✅ Fixed {file_path}")
print(f"Original lines: {len(lines)}")
print(f"After removing duplicate Profile: {len(new_lines)}")
print(f"Final lines: {len(final_lines)}")
