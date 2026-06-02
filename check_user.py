import sqlite3, json, sys
sys.stdout.reconfigure(encoding='utf-8')

conn = sqlite3.connect('db/grindos.db')
conn.row_factory = sqlite3.Row

user = conn.execute('SELECT * FROM users WHERE id = 3').fetchone()
if not user:
    print('User 3 not found')
    exit()
print('=== USER ===')
print(f"  id={user['id']}  username={user['username']}  timezone={user['timezone']}")

stats = conn.execute('SELECT * FROM player_stats WHERE user_id = 3').fetchone()
print('\n=== PLAYER STATS ===')
if stats:
    s = dict(stats)
    print(f"  Level={s['level']}  EXP={s['exp']}  Streak={s['streak']}  Multiplier={s['difficulty_multiplier']}")
    print(f"  STR={s['str_stat']}  INT={s['int_stat']}  VIT={s['vit_stat']}")

ctx = conn.execute('SELECT main_goal, metadata FROM ai_contexts WHERE user_id = 3').fetchone()
if ctx:
    print('\n=== GOAL ===')
    print(f"  {ctx['main_goal']}")
    meta = json.loads(ctx['metadata'])
    arc = meta.get('current_arc', {})
    print('\n=== CURRENT ARC ===')
    print(f"  {arc.get('arc_name')}  |  start: {arc.get('arc_start_date')}")
    for m in arc.get('milestones', []):
        print(f"  W{m['week_number']}: {m['objective']}")

plans = conn.execute(
    "SELECT id, date, ecr_score, user_note FROM daily_plans WHERE user_id = ? ORDER BY date",
    (3,)
).fetchall()
print(f'\n=== DAILY PLANS ({len(plans)} total) ===')
for p in plans:
    t = conn.execute(
        'SELECT COUNT(*) as c, SUM(is_completed) as d FROM tasks WHERE daily_plan_id=?',
        (p['id'],)
    ).fetchone()
    done = t['d'] or 0
    print(f"  {p['date']}  ECR={p['ecr_score']}%  tasks={done}/{t['c']}  note={p['user_note']}")

print('\n=== TASK HISTORY ===')
for p in plans:
    tasks = conn.execute(
        'SELECT title, duration_mins, is_completed, modification_state, origin_type '
        'FROM tasks WHERE daily_plan_id=? ORDER BY id',
        (p['id'],)
    ).fetchall()
    done_mins = sum(t['duration_mins'] for t in tasks if t['is_completed'])
    total_mins = sum(t['duration_mins'] for t in tasks)
    done_count = sum(1 for t in tasks if t['is_completed'])
    calc_ecr = round(done_mins / total_mins * 100, 1) if total_mins else 0
    print(f"\n  [{p['date']}]  {done_count}/{len(tasks)} tasks  {done_mins}/{total_mins}m  calc_ECR={calc_ecr}%  stored_ECR={p['ecr_score']}%")
    for t in tasks:
        tick = '[x]' if t['is_completed'] else '[ ]'
        mod = f" ({t['modification_state']})" if t['modification_state'] != 'UNCHANGED' else ''
        print(f"    {tick} {t['duration_mins']:>3}m  {t['title']}{mod}")

conn.close()
