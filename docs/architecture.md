# 系统架构草案

本文件定义计划实现的系统，不表示模块已可运行。

## 数据与模块接口

| 模块 | 输入 | 输出 | 必须检查 |
| --- | --- | --- | --- |
| 训练资产构建 | TRAIN 清单、示范、可用几何与观测 | 带版本的资产与轨迹索引 | split、许可、尺度、来源哈希 |
| RGB-D 感知 | RGB、深度、内外参、机器人状态 | 几何、物体位姿假设与置信度 | 深度单位、坐标系、时间同步 |
| 世界构建 | 资产、观测状态、参数假设 | 可恢复的场景快照 | 碰撞体、接触、穿透、约束 |
| 候选生成 | 场景快照、子任务、参考轨迹 | 带时序的抓取和运动候选 | 可达性、关节限位、动作格式 |
| 并行搜索 | 快照、候选、固定预算 | rollout、谓词、代价与失败原因 | 子世界独立、种子、超时 |
| 决策器 | 可行候选及其跨假设结果 | 执行片段或拒绝执行 | 鲁棒性阈值、观测一致性 |
| 执行与对齐 | 动作片段、后续 RGB-D 与机器人状态 | 新快照、任务进展、重规划请求 | 漂移、抓取状态、终止条件 |

## 状态表示

每个快照至少包含时间戳、标定版本、资产版本、物体身份、物体位姿假设、机器人关节状态、夹爪状态、接触/约束假设和任务进度。明确使用米、弧度及位姿坐标系；相机到机器人基座的变换必须独立标定。

位姿不确定性与候选轨迹是两个不同维度：同一候选需要在多个合理的位姿和物理参数假设下测试，避免仅选择一个有利的世界而过度估计鲁棒性。

## 控制循环（伪代码）

```text
assets = build_from_train(train_manifest)
while task_budget_remains:
    observation = observe_rgbd_and_robot()
    belief = reconstruct_and_align(observation, assets, previous_belief)
    if perception_is_insufficient(belief):
        actively_observe_or_stop()
        continue
    candidates = propose_trajectories(belief, train_references)
    results = simulate_with_fixed_budget(candidates, belief.hypotheses)
    feasible = filter_by_physics_and_task_predicates(results)
    if no_robust_candidate(feasible):
        reobserve_replan_or_stop_with_reason()
        continue
    execute_short_horizon(select_robust_candidate(feasible))
    if verify_task_in_execution_world():
        record_success_and_exit()
record_timeout_or_failure()
```

## 对齐与失败恢复

- **初始对齐：** 检查观测点云与渲染几何的残差、可见性和深度有效率。
- **抓取后：** 更新物体相对夹爪的变换，验证物体确实随夹爪运动。
- **释放后：** 验证物体稳定落位和目标任务谓词；不能仅检查夹爪已张开。
- **执行偏差：** 先停止当前片段，再重建；不要持续播放已失效的长轨迹。
- **无可行候选：** 在预设预算内主动观察或改变候选族，耗尽预算即记失败。

阈值在验证集调定并冻结。在线评测时不得读取被禁止的真实物体位姿、隐藏状态、测试示范或测试答案。

## 实施里程碑

1. **M0：接口冻结。** 确定引擎、硬件或在线环境、训练格式、动作接口及允许观测。
2. **M1：静态重建。** 在固定样例上报告位姿与几何误差、失败类别。
3. **M2：单次交互。** 完成有接触动力学的抓取、搬运和释放，检查执行证据。
4. **M3：多世界闭环。** 加入候选搜索、跨假设验证、短片段执行和重新对齐。
5. **M4：独立评测。** 冻结配置、运行全部测试并记录失败，不以挑选演示代替结果。

需要用户或现有工程明确的集成信息：仿真引擎及版本、机器人/在线执行 API、TRAIN 数据路径与许可、相机参数、首批任务及运行算力。当前目录中的既有实验代码未迁移、审计或认定为本项目实现。
