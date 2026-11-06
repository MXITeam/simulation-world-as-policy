# Website videos

## Modeling

`modeling.mp4` shows TRAIN episode 301 beside a physics replay of the reconstructed airplane mesh. Source: `train_scene_rgbd_20261105/w2/comparison/native_action_rgb_comparison.mp4`. The first two panels are retained, diagnostic overlays are cropped, and playback is slowed to 0.5×. The reconstruction uses all 115 frames and three cameras; depth comes from an approximate RGB-aligned source scene. This is an offline modeling experiment.

## Successful execution

`shelf-success.mp4` is the main-camera crop of `shelf_w1w2_case001_20261106/evidence_scene_01/w1_online_execution.mp4`. It retains the supplied recording timing and complete clip. The recording is a simulation rollout of `stock_and_straighten_shelf`, scene 01, case 1, seed 1. The archived native evaluation reports E2E = 1 and five subtask scores of 1. [Evaluation extract](shelf-result.json).

Earlier gallery clips remain available in this directory but are no longer featured on the website.
