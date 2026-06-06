# GrindOS — User Flow Design

## Mental Model

GrindOS biến việc học / luyện một kỹ năng thành một chiến dịch RPG 30 ngày. Người dùng tuyên bố một goal, AI tạo ra lộ trình (Arc), mỗi ngày hệ thống giao task, cuối ngày tính điểm và cập nhật chỉ số nhân vật.

**Vòng lặp cốt lõi:**
```
Khai báo goal → Nhận task mỗi sáng → Làm task → Báo cáo cuối ngày → Nhận thống kê → Lặp lại 30 ngày → Chuyển Arc
```

---

## 1. Onboarding (Lần đầu dùng)

Người dùng chỉ làm onboarding **một lần duy nhất**.

### Màn hình 1 — Khai báo Goal
- Nhập **username**
- Nhập **main goal** (cụ thể càng tốt, VD: *"Học Golang backend để đi làm trong 6 tháng"*)
- Timezone tự động detect từ browser

### Màn hình 2 — 5 câu hỏi Context
Mỗi câu một màn, chọn 1 trong 4 đáp án:
1. Trình độ hiện tại trong lĩnh vực này?
2. Bao nhiêu giờ/ngày có thể commit?
3. Motivation là gì? (career / project / growth / academic)
4. Đã từng thử học lĩnh vực này chưa?
5. Mức độ khẩn cấp?

### Màn hình 3 — Loading (~10 giây)
Gemini nhận goal + context → tạo **Arc I**: 1 arc name + 4 milestone theo tuần.

### Màn hình 4 — Arc Revealed
Hiện tên Arc và 4 milestones. Người dùng thấy lộ trình 30 ngày của mình.

→ **Chuyển vào Admin Panel để bắt đầu ngày đầu tiên.**

---

## 2. Daily Loop (Mỗi ngày)

```
Sáng                    Trong ngày              Tối
─────────────────────   ─────────────────────   ─────────────────────
Run Thinking            Vào Daily Plan          Run Learning
AI generate tasks   →   Tick task done      →   AI tính ECR
                        Edit / Add task         Update RPG stats
                        Viết note cuối ngày
```

### Sáng — Nhận task (Admin Panel → Run Thinking)
- Bấm **Run Thinking** → AI Core generate danh sách task cho hôm nay
- Task được tạo dựa trên: milestone của tuần hiện tại + phase hiện tại + difficulty multiplier của người dùng
- Budget thời gian = `120 phút × difficulty_multiplier`
- **Chỉ có thể Run Thinking một lần/ngày** (idempotent — bấm lại không tạo thêm)

### Trong ngày — Làm task (Daily Plan page)
- Xem danh sách task với thời gian ước tính
- **Tick checkbox** → đánh dấu task hoàn thành
- **Click vào tên task** → edit inline
- **Click vào số phút** → sửa duration
- **Hover → nút `+`** → tạo subtask ngay bên dưới
- **Hover → nút `✕`** → xóa task (soft delete, vẫn tính cho ECR)
- **Nút `+ Add task`** ở cuối → thêm task mới hoàn toàn
- Viết **end-of-day note** → bấm Save

### Tối — Kết thúc ngày (Admin Panel → Run Learning)
- Bấm **Run Learning** → AI Core tính ECR
- ECR = `tổng phút task đã hoàn thành / tổng phút tất cả task × 100`
- Thấy ngay kết quả: ECR% + event (POWER_UP / STABLE / PENALTY)
- Stat boxes hiện delta: `+1 VIT`, `+20 EXP`, v.v.
- **Advance to next day →** để chuyển sang ngày hôm sau

---

## 3. Task Management

| Hành động | Cách làm | Ghi chú |
|-----------|----------|---------|
| Tick hoàn thành | Click checkbox | Toggle được (untick nếu nhầm) |
| Edit tên task | Click vào tên → Enter để save | Escape để hủy |
| Edit thời gian | Click vào số phút → Enter | Đơn vị: phút |
| Thêm subtask | Hover task → `+` | Subtask hiển thị thụt vào |
| Xóa task | Hover task → `✕` → confirm | Soft delete — vẫn tính vào ECR |
| Thêm task mới | Nút `+ Add task` ở cuối danh sách | Tạo ở level gốc |

**Lưu ý về xóa task và ECR:**
- Task bị xóa vẫn được tính vào mẫu số ECR nếu chưa hoàn thành
- Mục đích: tránh người dùng "cheat" ECR bằng cách xóa task chưa làm
- Data task xóa được giữ lại để phân tích sau này

---

## 4. RPG Stats — Ý nghĩa từng chỉ số

| Stat | Ý nghĩa | Thay đổi khi nào |
|------|---------|-----------------|
| **Level** | Cấp độ tổng thể | Tăng khi EXP đạt ngưỡng |
| **EXP** | Điểm kinh nghiệm | +20 mỗi POWER_UP, +5 mỗi PENALTY/STABLE |
| **STR** (Strength) | Độ bền, kỷ luật | -1 mỗi PENALTY |
| **INT** (Intelligence) | Khả năng học | +1 khi streak ≥ 3 và POWER_UP |
| **VIT** (Vitality) | Năng lượng, consistency | +1 mỗi POWER_UP |
| **Streak** | Ngày POWER_UP liên tiếp | Reset về 0 khi PENALTY |
| **Multiplier** | Hệ số độ khó task | +0.1 POWER_UP, -0.2 PENALTY, min 0.1 |

---

## 5. Hệ thống ECR — 3 Kết quả mỗi ngày

```
ECR ≥ 85%   →  ⚡ POWER_UP   +0.1 multiplier, +20 EXP, +1 VIT, +1 streak
                               nếu streak ≥ 3: +1 INT

65% ≤ ECR < 85%  →  ➡ STABLE   Không thay đổi stats

ECR < 65%   →  💀 PENALTY   -0.2 multiplier, +5 EXP, -1 STR, streak = 0
```

**Multiplier ảnh hưởng trực tiếp đến budget task:**
- Multiplier 1.0 → 120 phút/ngày
- Multiplier 1.5 → 180 phút/ngày (task nặng hơn)
- Multiplier 0.8 → 96 phút/ngày (sau nhiều PENALTY)

---

## 6. Arc System — Lộ trình 30 ngày

### 3 Phase theo ngày trong Arc

| Phase | Ngày | Đặc điểm task |
|-------|------|---------------|
| **CALIBRATE** | Day 1–5 | Task nhẹ, dễ vào, build momentum |
| **CHALLENGING** | Day 6–20 | Task nặng, deep work, push skill |
| **ROUTINE** | Day 21–30 | Task ổn định, habit formation |

### 4 Milestones theo tuần

Mỗi tuần AI tạo task gắn với 1 milestone cụ thể:
- W1 (Day 1–7): Milestone 1
- W2 (Day 8–14): Milestone 2
- W3 (Day 15–21): Milestone 3
- W4 (Day 22–30): Milestone 4

Người dùng chỉ thấy **milestone của tuần hiện tại** (Fog of War — không thấy trước).

---

## 7. Arc Bridge — Ngày 30 (Kết thúc Arc)

Ngày 30 là **Judgment Day** — kết thúc Arc I, mở Arc II.

### Flow:
1. Run Learning ngày 30 → AI phân tích 30 ngày execution của người dùng
2. AI tạo **2–3 lựa chọn Arc II** dựa trên pattern thực tế (POWER_UP / PENALTY / STABLE)
3. Mỗi lựa chọn là một hướng phát triển khác nhau phù hợp với profile người dùng
4. Người dùng chọn 1 path
5. Arc II bắt đầu ngay lập tức với milestone mới

**Ví dụ Arc Bridge:**
- Người dùng có nhiều PENALTY → AI nhận ra pattern thiếu consistency → đề xuất arc tập trung vào habit
- Người dùng POWER_UP đều đặn → AI đề xuất arc nâng cao hơn, challenge lớn hơn

---

## 8. Screens Summary

| URL | Ai dùng | Làm gì |
|-----|---------|--------|
| `/onboarding` | User mới | Khai báo goal + context questions |
| `/daily-plan` | User hằng ngày | Xem + tick + edit tasks |
| `/admin` | Dev / tester | Trigger pipelines, xem stats, advance days |

> **`/admin` không phải "admin role":** Đây là dev tooling, **không có auth**. Các API route tương ứng (`/admin/*`) hiện unprotected hoàn toàn — xem danh sách đầy đủ và cảnh báo security tại [docs/architecture/database.md § Route Contract](../architecture/database.md).

---

## 9. User Journey Map — Toàn bộ vòng đời

```
Ngày 1
├── Onboarding: khai báo goal + 5 câu hỏi
├── Arc I được forge bởi AI
├── Admin: Run Thinking → nhận task đầu tiên (CALIBRATE phase)
└── Daily Plan: làm task, tick done, viết note

Ngày 1–5 (CALIBRATE)
└── Task nhẹ, build habit → hầu hết POWER_UP

Ngày 6–20 (CHALLENGING)
├── Task nặng hơn, budget cao hơn
├── PENALTY xảy ra → multiplier giảm, task nhẹ bớt tạm thời
└── INT tăng nếu duy trì streak ≥ 3

Ngày 21–29 (ROUTINE)
└── Task ổn định, rhythm được thiết lập

Ngày 30 (JUDGMENT DAY)
├── Run Learning → Arc Bridge trigger
├── AI phân tích 30 ngày → đề xuất 2–3 Arc II path
├── User chọn path
└── Arc II bắt đầu → lặp lại từ đầu với goal tinh chỉnh hơn
```
