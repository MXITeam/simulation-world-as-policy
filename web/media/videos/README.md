# Experiment recordings

These clips cover separate development experiments. Videos are H.264 MP4 with browser playback controls; frames are not interpolated. Audio is omitted.

- `rgbd-observations.mp4`: `train_scene_rgbd_20261105/media/full_train_rgbd.mp4`. TRAIN episode 301, 115 frames and three cameras. Depth is rendered from an approximate RGB-aligned source scene; source motion follows RGB-estimated object poses.
- `grasp-comparison.mp4`: `train_scene_rgbd_success_failure_20261105/success_failure.mp4`. Evidence replay of recorded physics trials comparing the source-scene fixture and reconstructed airplane. Includes both agreement and disagreement in success/failure. These are in-sample development trials.
- `candidate-placement.mp4`: `tower/pr_video_pair/02_W2_第二块放偏_完整候选.mp4`. Complete W2 candidate with an off-target second-block placement.
- `tower-execution.mp4`: `tower/pr_video_pair/01_MXI_三层搭塔成功_完整回合.webm`. Complete W1 tower-building simulation recording, presented at 12× speed (about 90 seconds).

The package-sorting result described elsewhere is a separate episode.
