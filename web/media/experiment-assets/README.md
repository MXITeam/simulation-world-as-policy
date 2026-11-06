# Experiment asset provenance

Provided by the project team; retrieved 2026-11-06 via SSH port 5626.
The supplied /mnt/pfs/gwbrj2 paths map to /mnt/pfs/1011ai on this instance.

- airplane_rgbd_full_sequence.ply: our RGB-D reconstruction, 33,801 vertices and 64,636 faces. Source: longlibo/train_scene_rgbd_20261105/w2/.
- airplane-reconstruction.svg: orthographic projection of the PLY triangles; display colors aid geometry visibility. The PLY remains the source.
- native_action_rgb_comparison.mp4: our modeling comparison experiment, source under w2/comparison/.
- full_train_rgbd.mp4: three camera RGB views and recovered-scene rendered depth, source under media/. Depth is not claimed as a raw real-camera measurement.
- swap-*.jpg: frame at one second from the corresponding video.

The tower episode_000000.mp4 identified by the user is an original RoboColiseum dataset demonstration, not our experimental result. It has not been imported here.
Real-world execution in the hero remains a method target; these assets originate from RoboColiseum simulation experiments.

- swap-head-rgbd.mp4 and .jpg: head view only, cropped from the left third of full_train_rgbd.mp4; RGB above, rendered depth below.
- Reconstruction cloud: aircraft samples come from the supplied PLY; scattered background points illustrate task-based filtering, not a measured reconstruction trace.

## Robot CAD display

robot/link-1.png through link-7.png are orthographic renders of the actual arm_l_link1...7 visual meshes in G2_omnipicker/robot_fix.usda. Geometry was resolved with usd-core, then lit and projected to transparent images. Silver metal and dark casing material classes follow the source material bindings. These are rendered 2D CAD parts attached to the website's existing schematic motion rig, not a URDF runtime or a physically calibrated 7-DoF robot simulation. No image textures were found on these link material bindings.

- airplane-mesh.png: transparent shaded render of the supplied PLY, used in the overview to keep repeated rollout and zoom rendering light.
- Evolution speed and expanding coverage animations are illustrative; they do not report measured training/search performance.

## Object asset catalog

asset-catalog.json records authored USD masses, static/dynamic friction and collision approximations read from the user-provided assets. These are simulation configuration values, not measured properties. The source JSON manifest and USD masses disagree for some models; cards use the USD values. Cup and bowl silhouettes are schematic thumbnails. Green points mark illustrative grasp candidates, not verified grasp poses. Missing mug/bowl material and collision data remain pending rather than inheriting defaults.

## Asset turntable previews

turntables/ contains 96-frame transparent yaw-turntable sheets (8 columns) and projected candidate contact positions in catalog.json. Plane geometry comes from the supplied PLY, welded on a 2 mm display grid. Cup, mug, bowl and paper-cup previews are procedural illustrative geometries matching the previous schematic thumbnails; they are not reconstructions of the linked USD instances. Physics text remains sourced from asset-catalog.json. The shared animation clock drives orientation, projected grasp points, pause/play and reduced-motion behavior.
