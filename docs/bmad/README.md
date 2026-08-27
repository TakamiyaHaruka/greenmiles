# BMad Method artifacts

Everything in this folder was produced while planning and building GreenMiles
with **BMad Method v6.7.1** and AI agents — no code here, just the full paper
trail of an agent-driven development process.

Docs are mostly in Chinese.

```
planning-artifacts/
├── briefs/               # product brief
├── prds/prd-GreenMiles-2026-05-25/
│   ├── prd.md            # PRD with 19 logged decisions
│   ├── .decision-log.md  # decision log
│   ├── Carbon_Calculation_Spec.md   # input: emission factors spec
│   ├── UI设计初稿.md      # input: early UI direction
│   ├── 答复1.md / 答复2.md # input: author's Q&A answers during PRD elicitation
│   └── 商品兑换逻辑表.xlsx # input: redemption rules table
├── architecture.md       # tech decisions (SQLite, JWT, Zustand, …)
├── ux-design-specification.md
├── epics.md              # 4 epics, 17 stories
└── implementation-readiness-report-2026-05-27.md

implementation-artifacts/
├── 1-x … 4-x             # per-story implementation notes
├── project-progress.md   # story-by-story progress
└── sprint-status.yaml    # machine-readable sprint state
```

Suggested reading order: `brief.md` → `prd.md` → `architecture.md` →
`ux-design-specification.md` → `epics.md` → `implementation-artifacts/`.

For a narrative recap (in Chinese) see [`../zh-CN/项目全记录.md`](../zh-CN/项目全记录.md).
