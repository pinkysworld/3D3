import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.158.0/examples/jsm/controls/OrbitControls.js?module";

const createFallbackRenderer = () => ({
  isSupported: false,
  resize() {},
  setGridSize() {},
  updateScene() {},
  setEnabled() {},
  resetCamera() {},
  rotate() {},
  zoomBy() {},
  move() {},
  elevate() {},
  dispose() {},
});

const disposeObject3D = (object) => {
  object.traverse((child) => {
    if (child.geometry) {
      child.geometry.dispose();
    }
    if (Array.isArray(child.material)) {
      child.material.forEach((material) => material?.dispose?.());
    } else if (child.material) {
      child.material.dispose?.();
    }
    if (child.userData?.dispose) {
      child.userData.dispose();
    }
  });
};

const clearGroup = (group) => {
  for (let i = group.children.length - 1; i >= 0; i -= 1) {
    const child = group.children[i];
    group.remove(child);
    disposeObject3D(child);
  }
};

const createGroundCanvas = () => {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#071226";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(59, 130, 246, 0.12)";
  ctx.lineWidth = 1;
  const step = size / 8;
  for (let i = 0; i <= 8; i += 1) {
    const offset = Math.round(i * step) + 0.5;
    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, offset);
    ctx.lineTo(size, offset);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(14, 116, 144, 0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0.5);
  ctx.lineTo(size, 0.5);
  ctx.lineTo(size - 0.5, size);
  ctx.lineTo(0, size);
  ctx.closePath();
  ctx.stroke();
  return canvas;
};

const drawRoundedRect = (ctx, x, y, width, height, radius) => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

export const createThreeSceneRenderer = ({ canvas, pixelRatio = window.devicePixelRatio || 1 } = {}) => {
  if (typeof window === "undefined" || !canvas) {
    return createFallbackRenderer();
  }

  try {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0x061424, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x061424, 60, 180);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 600);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.minDistance = 6;
    controls.maxDistance = 160;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = false;

    const root = new THREE.Group();
    scene.add(root);

    const groundGroup = new THREE.Group();
    const parcelGroup = new THREE.Group();
    const shellGroup = new THREE.Group();
    const roomGroup = new THREE.Group();
    const agentGroup = new THREE.Group();

    root.add(groundGroup);
    root.add(parcelGroup);
    root.add(shellGroup);
    root.add(roomGroup);
    root.add(agentGroup);

    const roomInstances = [];

    const ambient = new THREE.AmbientLight(0x96b6ff, 0.55);
    scene.add(ambient);
    const hemi = new THREE.HemisphereLight(0x74c1ff, 0x0b1423, 0.48);
    scene.add(hemi);
    const directional = new THREE.DirectionalLight(0xffffff, 0.85);
    directional.position.set(-16, 22, 14);
    directional.castShadow = true;
    directional.shadow.mapSize.set(1024, 1024);
    directional.shadow.camera.near = 2;
    directional.shadow.camera.far = 120;
    directional.shadow.camera.left = -60;
    directional.shadow.camera.right = 60;
    directional.shadow.camera.top = 60;
    directional.shadow.camera.bottom = -60;
    directional.shadow.bias = -0.00035;
    scene.add(directional);

    let gridSize = { width: 1, height: 1 };
    let enabled = false;
    let animationId = null;
    let groundTextureCanvas = null;
    let defaultCameraSet = false;

    const ensureGroundTexture = () => {
      if (!groundTextureCanvas) {
        groundTextureCanvas = createGroundCanvas();
      }
      const texture = new THREE.CanvasTexture(groundTextureCanvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy?.() ?? 8;
      return texture;
    };

    const toWorldPosition = (x, y) => ({
      x: x - gridSize.width / 2,
      z: y - gridSize.height / 2,
    });

    const updateGround = () => {
      clearGroup(groundGroup);
      const width = Math.max(1, gridSize.width);
      const height = Math.max(1, gridSize.height);
      const texture = ensureGroundTexture();
      texture.repeat.set(width, height);
      const material = new THREE.MeshStandardMaterial({
        map: texture,
        color: 0xffffff,
        roughness: 0.94,
        metalness: 0.05,
      });
      material.side = THREE.DoubleSide;
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
      plane.rotation.x = -Math.PI / 2;
      plane.receiveShadow = true;
      plane.userData.dispose = () => {
        texture.dispose();
        material.dispose();
      };
      groundGroup.add(plane);

      const gridHelper = new THREE.GridHelper(
        width,
        Math.max(width, height),
        0x1d4ed8,
        0x1e3a8a
      );
      gridHelper.material.opacity = 0.24;
      gridHelper.material.transparent = true;
      gridHelper.position.y = 0.01;
      groundGroup.add(gridHelper);
    };

    const updateParcels = (parcels = []) => {
      clearGroup(parcelGroup);
      parcels.forEach((parcel) => {
        const width = Math.max(0.01, parcel.width);
        const height = Math.max(0.01, parcel.height);
        const geometry = new THREE.BoxGeometry(width, 0.1, height);
        const color = parcel.owned ? 0x38bdf8 : 0x1e293b;
        const opacity = parcel.owned ? 0.22 : 0.12;
        const material = new THREE.MeshStandardMaterial({
          color,
          emissive: parcel.owned ? 0x14578a : 0x050b1a,
          emissiveIntensity: parcel.owned ? 0.4 : 0.2,
          transparent: true,
          opacity,
          roughness: 0.9,
          metalness: 0.05,
        });
        const mesh = new THREE.Mesh(geometry, material);
        const world = toWorldPosition(parcel.x + parcel.width / 2, parcel.y + parcel.height / 2);
        mesh.position.set(world.x, 0.02, world.z);
        mesh.receiveShadow = true;
        parcelGroup.add(mesh);

        const edgeGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(width, 0.1, height));
        const edgeMaterial = new THREE.LineBasicMaterial({
          color: parcel.owned ? 0x60a5fa : 0x1f2a44,
          transparent: true,
          opacity: parcel.owned ? 0.6 : 0.3,
        });
        const wire = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        wire.position.copy(mesh.position);
        parcelGroup.add(wire);
      });
    };

    const updateShells = (shells = []) => {
      clearGroup(shellGroup);
      shells.forEach((shell) => {
        const group = new THREE.Group();
        const width = Math.max(0.01, shell.width);
        const depth = Math.max(0.01, shell.height);
        const world = toWorldPosition(shell.x + width / 2, shell.y + depth / 2);
        group.position.set(world.x, 0, world.z);

        const wallHeight = 3.8;
        const wallThickness = 0.24;

        const foundationMaterial = new THREE.MeshStandardMaterial({
          color: 0x091324,
          roughness: 0.9,
          metalness: 0.08,
          transparent: true,
          opacity: 0.95,
        });
        const foundation = new THREE.Mesh(
          new THREE.BoxGeometry(width + 0.6, 0.16, depth + 0.6),
          foundationMaterial
        );
        foundation.position.y = -0.12;
        foundation.receiveShadow = true;
        group.add(foundation);

        const wallMaterial = new THREE.MeshStandardMaterial({
          color: 0x13253f,
          emissive: 0x10233f,
          emissiveIntensity: 0.45,
          roughness: 0.7,
          metalness: 0.2,
          transparent: true,
          opacity: 0.88,
        });

        const createWall = (orientation) => {
          const horizontal = orientation === "north" || orientation === "south";
          const geometry = horizontal
            ? new THREE.BoxGeometry(width, wallHeight, wallThickness)
            : new THREE.BoxGeometry(wallThickness, wallHeight, depth);
          const mesh = new THREE.Mesh(geometry, wallMaterial.clone());
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          switch (orientation) {
            case "north":
              mesh.position.set(0, wallHeight / 2, -depth / 2 + wallThickness / 2);
              break;
            case "south":
              mesh.position.set(0, wallHeight / 2, depth / 2 - wallThickness / 2);
              break;
            case "east":
              mesh.position.set(width / 2 - wallThickness / 2, wallHeight / 2, 0);
              break;
            case "west":
              mesh.position.set(-width / 2 + wallThickness / 2, wallHeight / 2, 0);
              break;
            default:
              break;
          }
          group.add(mesh);
        };

        ["north", "south", "east", "west"].forEach(createWall);

        const frame = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.BoxGeometry(width, wallHeight, depth)),
          new THREE.LineBasicMaterial({
            color: 0x93c5fd,
            transparent: true,
            opacity: 0.4,
          })
        );
        frame.position.y = wallHeight / 2;
        group.add(frame);

        const columnMaterial = new THREE.MeshStandardMaterial({
          color: 0x1f2a44,
          roughness: 0.65,
          metalness: 0.22,
        });
        const columnGeometry = new THREE.BoxGeometry(0.28, wallHeight, 0.28);
        const cornerOffsets = [
          [-width / 2 + wallThickness / 2, -depth / 2 + wallThickness / 2],
          [width / 2 - wallThickness / 2, -depth / 2 + wallThickness / 2],
          [-width / 2 + wallThickness / 2, depth / 2 - wallThickness / 2],
          [width / 2 - wallThickness / 2, depth / 2 - wallThickness / 2],
        ];
        cornerOffsets.forEach(([x, z]) => {
          const column = new THREE.Mesh(columnGeometry, columnMaterial.clone());
          column.position.set(x, wallHeight / 2, z);
          column.castShadow = true;
          column.receiveShadow = true;
          group.add(column);
        });

        const roofFrame = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.BoxGeometry(width + 0.6, 0.1, depth + 0.6)),
          new THREE.LineBasicMaterial({
            color: 0x60a5fa,
            transparent: true,
            opacity: 0.55,
          })
        );
        roofFrame.position.y = wallHeight + 0.05;
        group.add(roofFrame);

        const addFixturePanel = (fixture, { type }) => {
          const maxIndex =
            fixture.wall === "north" || fixture.wall === "south" ? width - 1 : depth - 1;
          const index = Math.max(0, Math.min(maxIndex, fixture.index ?? 0));
          const offset =
            fixture.wall === "north" || fixture.wall === "south"
              ? -width / 2 + index + 0.5
              : -depth / 2 + index + 0.5;
          const isDoor = type === "door";
          const panelWidth = isDoor ? 0.9 : 0.8;
          const panelHeight = isDoor ? 2.8 : 1.4;
          const panel = new THREE.Mesh(
            new THREE.PlaneGeometry(panelWidth, panelHeight),
            new THREE.MeshStandardMaterial({
              color: isDoor ? 0x2563eb : 0x93c5fd,
              emissive: isDoor ? 0x3b82f6 : 0x60a5fa,
              emissiveIntensity: isDoor ? 0.5 : 0.35,
              roughness: isDoor ? 0.35 : 0.25,
              metalness: isDoor ? 0.45 : 0.4,
              transparent: true,
              opacity: isDoor ? 0.92 : 0.75,
            })
          );
          panel.position.y = isDoor ? panelHeight / 2 : 2;
          panel.castShadow = false;
          panel.receiveShadow = false;
          const distance = wallThickness / 2 + 0.01;
          switch (fixture.wall) {
            case "north":
              panel.position.set(offset, panel.position.y, -depth / 2 + distance);
              panel.rotation.y = Math.PI;
              break;
            case "south":
              panel.position.set(offset, panel.position.y, depth / 2 - distance);
              break;
            case "east":
              panel.position.set(width / 2 - distance, panel.position.y, offset);
              panel.rotation.y = -Math.PI / 2;
              break;
            case "west":
              panel.position.set(-width / 2 + distance, panel.position.y, offset);
              panel.rotation.y = Math.PI / 2;
              break;
            default:
              break;
          }
          panel.renderOrder = 3;
          group.add(panel);

          if (isDoor) {
            const stoopMaterial = new THREE.MeshStandardMaterial({
              color: 0x0f172a,
              roughness: 0.85,
              metalness: 0.1,
            });
            const stoop = new THREE.Mesh(
              new THREE.BoxGeometry(panelWidth + 0.6, 0.12, 1.4),
              stoopMaterial
            );
            stoop.position.y = -0.06;
            switch (fixture.wall) {
              case "north":
                stoop.position.set(offset, stoop.position.y, -depth / 2 - 0.7);
                break;
              case "south":
                stoop.position.set(offset, stoop.position.y, depth / 2 + 0.7);
                break;
              case "east":
                stoop.rotation.y = Math.PI / 2;
                stoop.position.set(width / 2 + 0.7, stoop.position.y, offset);
                break;
              case "west":
                stoop.rotation.y = Math.PI / 2;
                stoop.position.set(-width / 2 - 0.7, stoop.position.y, offset);
                break;
              default:
                break;
            }
            stoop.receiveShadow = true;
            group.add(stoop);

            const awningMaterial = new THREE.MeshStandardMaterial({
              color: 0x1d4ed8,
              emissive: 0x3b82f6,
              emissiveIntensity: 0.6,
              roughness: 0.4,
              metalness: 0.42,
            });
            const awning = new THREE.Mesh(
              new THREE.BoxGeometry(panelWidth + 0.2, 0.12, 0.6),
              awningMaterial
            );
            const awningHeight = panelHeight - 0.1;
            awning.position.y = awningHeight;
            switch (fixture.wall) {
              case "north":
                awning.position.set(offset, awningHeight, -depth / 2 + wallThickness / 2 + 0.05);
                awning.rotation.y = Math.PI;
                break;
              case "south":
                awning.position.set(offset, awningHeight, depth / 2 - wallThickness / 2 - 0.05);
                break;
              case "east":
                awning.position.set(width / 2 - wallThickness / 2 - 0.05, awningHeight, offset);
                awning.rotation.y = -Math.PI / 2;
                break;
              case "west":
                awning.position.set(-width / 2 + wallThickness / 2 + 0.05, awningHeight, offset);
                awning.rotation.y = Math.PI / 2;
                break;
              default:
                break;
            }
            group.add(awning);
          }
        };

        if (Array.isArray(shell.windows)) {
          shell.windows.forEach((fixture) => addFixturePanel(fixture, { type: "window" }));
        }
        if (Array.isArray(shell.doors)) {
          shell.doors.forEach((fixture) => addFixturePanel(fixture, { type: "door" }));
        }

        shellGroup.add(group);
      });
    };

    const WORLD_UP = new THREE.Vector3(0, 1, 0);
    const moveVector = new THREE.Vector3();
    const forwardVector = new THREE.Vector3();
    const rightVector = new THREE.Vector3();
    const cameraToRoom = new THREE.Vector3();
    const cameraHorizontal = new THREE.Vector3();
    const cameraForward = new THREE.Vector3();
    const toRoomHorizontal = new THREE.Vector3();

    const createRoomGroup = (room) => {
      const group = new THREE.Group();
      const floorTexture = room.sprite
        ? new THREE.CanvasTexture(room.sprite)
        : null;
      if (floorTexture) {
        floorTexture.colorSpace = THREE.SRGBColorSpace;
        floorTexture.wrapS = THREE.RepeatWrapping;
        floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(Math.max(1, room.width), Math.max(1, room.height));
        floorTexture.anisotropy = renderer.capabilities.getMaxAnisotropy?.() ?? 8;
      }
      const floorMaterial = new THREE.MeshStandardMaterial({
        map: floorTexture ?? undefined,
        color: floorTexture ? 0xffffff : 0xb1d4ff,
        roughness: 0.82,
        metalness: 0.1,
      });
      floorMaterial.side = THREE.DoubleSide;
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(room.width, room.height), floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      if (floorTexture) {
        floor.userData.dispose = () => {
          floorTexture.dispose();
        };
      }
      group.add(floor);

      const wallHeight = 3.2;
      const wallThickness = 0.12;
      const baseColor = room.palette?.base ?? "#1f2a44";
      const accentColor = room.palette?.accent ?? room.palette?.mid ?? "#38bdf8";
      const wallMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(baseColor),
        roughness: 0.72,
        metalness: 0.18,
        emissive: new THREE.Color(accentColor).multiplyScalar(0.08),
        emissiveIntensity: 0.6,
      });
      const wallGeometries = {
        north: new THREE.BoxGeometry(room.width, wallHeight, wallThickness),
        south: new THREE.BoxGeometry(room.width, wallHeight, wallThickness),
        east: new THREE.BoxGeometry(wallThickness, wallHeight, room.height),
        west: new THREE.BoxGeometry(wallThickness, wallHeight, room.height),
      };

      const createWallMesh = (geometry) => {
        const mesh = new THREE.Mesh(geometry, wallMaterial.clone());
        const material = mesh.material;
        material.transparent = true;
        material.opacity = 0.92;
        material.depthWrite = false;
        mesh.userData.baseOpacity = material.opacity;
        return mesh;
      };

      const north = createWallMesh(wallGeometries.north);
      north.position.set(0, wallHeight / 2, -room.height / 2 + wallThickness / 2);
      north.castShadow = true;
      north.receiveShadow = true;
      group.add(north);

      const south = createWallMesh(wallGeometries.south);
      south.position.set(0, wallHeight / 2, room.height / 2 - wallThickness / 2);
      south.castShadow = true;
      south.receiveShadow = true;
      group.add(south);

      const east = createWallMesh(wallGeometries.east);
      east.position.set(room.width / 2 - wallThickness / 2, wallHeight / 2, 0);
      east.castShadow = true;
      east.receiveShadow = true;
      group.add(east);

      const west = createWallMesh(wallGeometries.west);
      west.position.set(-room.width / 2 + wallThickness / 2, wallHeight / 2, 0);
      west.castShadow = true;
      west.receiveShadow = true;
      group.add(west);

      const edgeGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(room.width, wallHeight, room.height));
      const edgeMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(accentColor).multiplyScalar(0.9),
        transparent: true,
        opacity: 0.35,
      });
      const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      edges.position.y = wallHeight / 2;
      group.add(edges);

      if (room.label) {
        const labelCanvas = document.createElement("canvas");
        labelCanvas.width = 256;
        labelCanvas.height = 128;
        const ctx = labelCanvas.getContext("2d");
        ctx.fillStyle = "rgba(8, 18, 34, 0.82)";
        ctx.strokeStyle = "rgba(56, 189, 248, 0.45)";
        ctx.lineWidth = 4;
        drawRoundedRect(ctx, 12, 12, labelCanvas.width - 24, labelCanvas.height - 24, 24);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#e0f2fe";
        ctx.font = "600 42px 'Segoe UI', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(room.label, labelCanvas.width / 2, labelCanvas.height / 2);
        const labelTexture = new THREE.CanvasTexture(labelCanvas);
        labelTexture.colorSpace = THREE.SRGBColorSpace;
        labelTexture.anisotropy = renderer.capabilities.getMaxAnisotropy?.() ?? 4;
        const labelMaterial = new THREE.SpriteMaterial({
          map: labelTexture,
          transparent: true,
          depthTest: false,
          depthWrite: false,
        });
        const sprite = new THREE.Sprite(labelMaterial);
        const scaleX = Math.min(room.width * 0.9, 6);
        const aspect = labelCanvas.height / labelCanvas.width;
        sprite.scale.set(scaleX, scaleX * aspect, 1);
        sprite.position.set(0, wallHeight + 0.4, 0);
        sprite.userData.dispose = () => {
          labelTexture.dispose();
        };
        group.add(sprite);
      }

      const world = toWorldPosition(room.x + room.width / 2, room.y + room.height / 2);
      group.position.set(world.x, 0, world.z);
      const center = new THREE.Vector3(world.x, wallHeight / 2, world.z);
      return {
        group,
        center,
        width: Math.max(0.01, room.width),
        depth: Math.max(0.01, room.height),
        wallHeight,
        walls: [
          {
            mesh: north,
            normal: new THREE.Vector3(0, 0, -1),
            interiorNormal: new THREE.Vector3(0, 0, 1),
            baseOpacity: north.userData.baseOpacity,
          },
          {
            mesh: south,
            normal: new THREE.Vector3(0, 0, 1),
            interiorNormal: new THREE.Vector3(0, 0, -1),
            baseOpacity: south.userData.baseOpacity,
          },
          {
            mesh: east,
            normal: new THREE.Vector3(1, 0, 0),
            interiorNormal: new THREE.Vector3(-1, 0, 0),
            baseOpacity: east.userData.baseOpacity,
          },
          {
            mesh: west,
            normal: new THREE.Vector3(-1, 0, 0),
            interiorNormal: new THREE.Vector3(1, 0, 0),
            baseOpacity: west.userData.baseOpacity,
          },
        ],
      };
    };

    const updateRooms = (rooms = []) => {
      clearGroup(roomGroup);
      roomInstances.length = 0;
      rooms.forEach((room) => {
        const instance = createRoomGroup(room);
        roomGroup.add(instance.group);
        roomInstances.push(instance);
      });
    };

    const capsuleGeometry = new THREE.CapsuleGeometry(0.26, 0.82, 8, 16);
    const baseGeometry = new THREE.CylinderGeometry(0.34, 0.38, 0.1, 24);
    const ringGeometry = new THREE.TorusGeometry(0.52, 0.06, 8, 32);

    const PATIENT_SKIN_TONES = [
      "#f4d7c6",
      "#e8b99c",
      "#cf9471",
      "#a97151",
      "#7d5030",
      "#593822",
    ];
    const PATIENT_HAIR_TONES = [
      "#201712",
      "#2f231b",
      "#3b2c1e",
      "#4f3824",
      "#6d4b2d",
      "#8a623a",
      "#b98a58",
      "#2d3748",
    ];
    const PATIENT_OUTFITS = [
      { top: "#60a5fa", bottom: "#3b82f6", accent: "#bfdbfe" },
      { top: "#34d399", bottom: "#059669", accent: "#bbf7d0" },
      { top: "#f472b6", bottom: "#ec4899", accent: "#fbcfe8" },
      { top: "#f59e0b", bottom: "#d97706", accent: "#fde68a" },
      { top: "#a855f7", bottom: "#7c3aed", accent: "#ddd6fe" },
      { top: "#f97316", bottom: "#ea580c", accent: "#fed7aa" },
      { top: "#22d3ee", bottom: "#0ea5e9", accent: "#bae6fd" },
      { top: "#facc15", bottom: "#eab308", accent: "#fef08a" },
    ];

    const createFaceSprite = ({
      seed = 1,
      eyeColor = "#0f172a",
      browColor = "#1f2937",
    } = {}) => {
      const canvas = document.createElement("canvas");
      canvas.width = 96;
      canvas.height = 96;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = eyeColor;
      const eyeYOffset = (seed % 4) - 1.5;
      const eyeSpread = 18;
      const eyeRadius = 6.2;
      ctx.beginPath();
      ctx.arc(canvas.width / 2 - eyeSpread, canvas.height / 2 + eyeYOffset, eyeRadius, 0, Math.PI * 2);
      ctx.arc(canvas.width / 2 + eyeSpread, canvas.height / 2 + eyeYOffset, eyeRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = browColor;
      ctx.lineCap = "round";
      ctx.lineWidth = 5.5;
      const browTilt = ((seed >> 2) % 5) * 0.06 - 0.12;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 - eyeSpread - 10, canvas.height / 2 - 6);
      ctx.lineTo(canvas.width / 2 - eyeSpread + 10, canvas.height / 2 - 10 - browTilt * 14);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 + eyeSpread - 10, canvas.height / 2 - 10 + browTilt * 14);
      ctx.lineTo(canvas.width / 2 + eyeSpread + 10, canvas.height / 2 - 6);
      ctx.stroke();
      ctx.strokeStyle = eyeColor;
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      const expression = (seed >> 4) % 5;
      if (expression === 0) {
        ctx.arc(canvas.width / 2, canvas.height / 2 + 22, 14, Math.PI * 0.1, Math.PI - Math.PI * 0.1);
      } else if (expression === 1) {
        ctx.moveTo(canvas.width / 2 - 12, canvas.height / 2 + 26);
        ctx.lineTo(canvas.width / 2 + 12, canvas.height / 2 + 26);
      } else if (expression === 2) {
        ctx.arc(canvas.width / 2, canvas.height / 2 + 28, 12, Math.PI * 0.95, Math.PI * 0.05, true);
      } else {
        ctx.moveTo(canvas.width / 2 - 14, canvas.height / 2 + 26);
        ctx.quadraticCurveTo(canvas.width / 2, canvas.height / 2 + 34, canvas.width / 2 + 14, canvas.height / 2 + 26);
        ctx.moveTo(canvas.width / 2 - 14, canvas.height / 2 + 26);
        ctx.quadraticCurveTo(canvas.width / 2, canvas.height / 2 + 20, canvas.width / 2 + 14, canvas.height / 2 + 26);
      }
      ctx.stroke();
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(0.46, 0.46, 1);
      sprite.userData.dispose = () => {
        texture.dispose();
      };
      return sprite;
    };

    const createAgentGroup = (agent) => {
      const group = new THREE.Group();
      const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x0b172c,
        roughness: 0.8,
        metalness: 0.2,
      });
      const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
      baseMesh.position.y = 0.05;
      baseMesh.receiveShadow = true;
      group.add(baseMesh);

      if (agent.type === "patient") {
        const seed = agent.id ?? Math.floor(Math.random() * 10_000);
        const skinHex = PATIENT_SKIN_TONES[seed % PATIENT_SKIN_TONES.length];
        const hairHex = PATIENT_HAIR_TONES[(seed >> 3) % PATIENT_HAIR_TONES.length];
        const outfit = PATIENT_OUTFITS[(seed >> 5) % PATIENT_OUTFITS.length];
        const topHex = agent.color ?? outfit.top;
        const bottomHex = outfit.bottom ?? topHex;
        const accentHex = outfit.accent ?? topHex;
        const heightVariance = ((seed >> 7) % 5 - 2) * 0.05;
        const legHeight = 0.86 + heightVariance * 0.4;
        const torsoHeight = 0.96 + heightVariance * 0.5;
        const hipHeight = 0.5 + heightVariance * 0.2;
        const torsoY = hipHeight + torsoHeight / 2 + 0.04;
        const headY = torsoY + torsoHeight / 2 + 0.28;

        const pantsMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color(bottomHex),
          roughness: 0.55,
          metalness: 0.12,
        });
        const torsoMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color(topHex),
          roughness: 0.48,
          metalness: 0.14,
        });
        const trimMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color(accentHex),
          emissive: agent.isEmergency ? new THREE.Color("#fda4af") : new THREE.Color(accentHex).multiplyScalar(0.2),
          emissiveIntensity: agent.isEmergency ? 0.6 : 0.25,
          roughness: 0.36,
          metalness: 0.2,
        });
        const skinMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color(skinHex),
          roughness: 0.68,
          metalness: 0.04,
        });
        const hairMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color(hairHex),
          roughness: 0.72,
          metalness: 0.18,
        });
        const shoeMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color("#111827"),
          roughness: 0.4,
          metalness: 0.22,
        });

        const legOffset = 0.18;
        const legTilt = ((seed >> 9) % 11 - 5) * 0.01;

        const leftLegGeometry = new THREE.CylinderGeometry(0.18, 0.2, legHeight, 18, 1, true);
        const leftLeg = new THREE.Mesh(leftLegGeometry, pantsMaterial);
        leftLeg.position.set(-legOffset, hipHeight, 0.04);
        leftLeg.rotation.z = legTilt;
        leftLeg.castShadow = true;
        group.add(leftLeg);

        const rightLegGeometry = new THREE.CylinderGeometry(0.18, 0.2, legHeight, 18, 1, true);
        const rightLeg = new THREE.Mesh(rightLegGeometry, pantsMaterial);
        rightLeg.position.set(legOffset, hipHeight, -0.02);
        rightLeg.rotation.z = -legTilt;
        rightLeg.castShadow = true;
        group.add(rightLeg);

        const leftShoeGeometry = new THREE.BoxGeometry(0.26, 0.1, 0.46);
        const leftShoe = new THREE.Mesh(leftShoeGeometry, shoeMaterial);
        leftShoe.position.set(-legOffset, 0.12, 0.16);
        leftShoe.castShadow = true;
        group.add(leftShoe);
        const rightShoeGeometry = new THREE.BoxGeometry(0.26, 0.1, 0.46);
        const rightShoe = new THREE.Mesh(rightShoeGeometry, shoeMaterial);
        rightShoe.position.set(legOffset, 0.12, 0.1);
        rightShoe.castShadow = true;
        group.add(rightShoe);

        const torsoGeometry = new THREE.CylinderGeometry(0.32, 0.34, torsoHeight, 24, 1, true);
        const torsoMesh = new THREE.Mesh(torsoGeometry, torsoMaterial);
        torsoMesh.position.set(0, torsoY, 0);
        torsoMesh.castShadow = true;
        group.add(torsoMesh);

        const accentGeometry = new THREE.BoxGeometry(0.58, 0.18, 0.42);
        const accentMesh = new THREE.Mesh(accentGeometry, trimMaterial);
        accentMesh.position.set(0, torsoY + torsoHeight * 0.18, 0.2);
        accentMesh.castShadow = true;
        group.add(accentMesh);

        const sleeveMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color(topHex).multiplyScalar(0.92),
          roughness: 0.5,
          metalness: 0.12,
        });
        const armOffset = 0.44;
        const armTilt = 0.28;

        const leftArmGeometry = new THREE.CylinderGeometry(0.11, 0.12, 0.72 + heightVariance * 0.2, 16);
        const leftArm = new THREE.Mesh(leftArmGeometry, sleeveMaterial);
        leftArm.position.set(-armOffset, torsoY + torsoHeight * 0.05, 0);
        leftArm.rotation.z = armTilt;
        leftArm.castShadow = true;
        group.add(leftArm);
        const rightArmGeometry = new THREE.CylinderGeometry(0.11, 0.12, 0.72 + heightVariance * 0.2, 16);
        const rightArm = new THREE.Mesh(rightArmGeometry, sleeveMaterial);
        rightArm.position.set(armOffset, torsoY + torsoHeight * 0.05, 0);
        rightArm.rotation.z = -armTilt;
        rightArm.castShadow = true;
        group.add(rightArm);

        const leftHandGeometry = new THREE.SphereGeometry(0.14, 16, 16);
        const leftHand = new THREE.Mesh(leftHandGeometry, skinMaterial);
        leftHand.position.set(-armOffset - 0.02, torsoY - torsoHeight * 0.25, 0.04);
        leftHand.castShadow = true;
        group.add(leftHand);
        const rightHandGeometry = new THREE.SphereGeometry(0.14, 16, 16);
        const rightHand = new THREE.Mesh(rightHandGeometry, skinMaterial);
        rightHand.position.set(armOffset + 0.02, torsoY - torsoHeight * 0.25, 0);
        rightHand.castShadow = true;
        group.add(rightHand);

        const headGeometry = new THREE.SphereGeometry(0.26 + heightVariance * 0.03, 24, 24);
        const headMesh = new THREE.Mesh(headGeometry, skinMaterial);
        headMesh.position.set(0, headY, 0);
        headMesh.castShadow = true;
        group.add(headMesh);

        const hairGeometry = new THREE.SphereGeometry(0.27 + heightVariance * 0.02, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.78);
        const hairMesh = new THREE.Mesh(hairGeometry, hairMaterial);
        hairMesh.position.set(0, headY + 0.05, -0.02);
        hairMesh.rotation.x = -0.22;
        hairMesh.castShadow = true;
        group.add(hairMesh);

        const collarGeometry = new THREE.TorusGeometry(0.28, 0.04, 12, 32);
        const collarMesh = new THREE.Mesh(collarGeometry, trimMaterial);
        collarMesh.position.set(0, torsoY + torsoHeight / 2 - 0.02, 0);
        collarMesh.rotation.x = Math.PI / 2;
        collarMesh.castShadow = true;
        group.add(collarMesh);

        const faceSprite = createFaceSprite({ seed, eyeColor: "#0f172a", browColor: hairHex });
        faceSprite.position.set(0, headY, 0.2);
        group.add(faceSprite);
      } else {
        const bodyMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color(agent.color ?? "#38bdf8"),
          emissive: new THREE.Color(agent.accent ?? agent.color ?? "#38bdf8").multiplyScalar(0.25),
          emissiveIntensity: agent.type === "patient" && agent.isEmergency ? 1.1 : 0.6,
          metalness: 0.18,
          roughness: 0.4,
        });
        const bodyMesh = new THREE.Mesh(capsuleGeometry, bodyMaterial);
        bodyMesh.position.y = 0.95;
        bodyMesh.castShadow = true;
        group.add(bodyMesh);
      }

      if (agent.type === "staff" && agent.label) {
        const labelCanvas = document.createElement("canvas");
        labelCanvas.width = 96;
        labelCanvas.height = 96;
        const ctx = labelCanvas.getContext("2d");
        ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
        ctx.beginPath();
        ctx.arc(48, 48, 38, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#bae6fd";
        ctx.font = "700 44px 'Segoe UI', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(agent.label, 48, 50);
        const spriteTexture = new THREE.CanvasTexture(labelCanvas);
        spriteTexture.colorSpace = THREE.SRGBColorSpace;
        const spriteMaterial = new THREE.SpriteMaterial({
          map: spriteTexture,
          transparent: true,
          depthWrite: false,
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(0.9, 0.9, 1);
        sprite.position.set(0, 2.1, 0);
        sprite.userData.dispose = () => {
          spriteTexture.dispose();
        };
        group.add(sprite);
      }

      if (agent.type === "patient" && agent.isEmergency) {
        const ringMaterial = new THREE.MeshStandardMaterial({
          color: 0xf87171,
          emissive: 0xdc2626,
          emissiveIntensity: 0.8,
          roughness: 0.3,
          metalness: 0.35,
        });
        const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
        ringMesh.rotation.x = Math.PI / 2;
        ringMesh.position.y = 0.06;
        ringMesh.castShadow = true;
        group.add(ringMesh);
      }

      return group;
    };

    const updateAgents = (agents = []) => {
      clearGroup(agentGroup);
      agents.forEach((agent) => {
        if (!agent?.position) return;
        const group = createAgentGroup(agent);
        const world = toWorldPosition(agent.position.x, agent.position.y);
        group.position.set(world.x, 0, world.z);
        agentGroup.add(group);
      });
    };

    const animate = () => {
      if (!enabled) {
        animationId = null;
        return;
      }
      updateRoomWallVisibility();
      controls.update();
      renderer.render(scene, camera);
      animationId = window.requestAnimationFrame(animate);
    };

    const updateRoomWallVisibility = () => {
      if (roomInstances.length === 0) {
        return;
      }
      const cameraPosition = camera.position;
      cameraForward.set(0, 0, 0);
      camera.getWorldDirection(cameraForward);
      cameraForward.y = 0;
      const hasForward = cameraForward.lengthSq() > 1e-6;
      if (hasForward) {
        cameraForward.normalize();
      }
      roomInstances.forEach((room) => {
        cameraToRoom.copy(cameraPosition).sub(room.center);
        cameraHorizontal.set(cameraToRoom.x, 0, cameraToRoom.z);
        const horizontalDistance = cameraHorizontal.length();
        const insideHorizontal = Math.abs(cameraToRoom.x) <= room.width / 2 + 0.4;
        const insideDepth = Math.abs(cameraToRoom.z) <= room.depth / 2 + 0.4;
        const insideHeight = cameraPosition.y <= room.wallHeight + 1.5;
        const isInside = insideHorizontal && insideDepth && insideHeight;
        if (horizontalDistance > 0) {
          cameraHorizontal.divideScalar(horizontalDistance);
        } else {
          cameraHorizontal.set(0, 0, 0);
        }
        toRoomHorizontal.subVectors(room.center, cameraPosition);
        toRoomHorizontal.y = 0;
        const toRoomDistance = toRoomHorizontal.length();
        if (toRoomDistance > 0) {
          toRoomHorizontal.divideScalar(toRoomDistance);
        } else {
          toRoomHorizontal.set(0, 0, 0);
        }
        const lookingTowardRoom = hasForward && toRoomDistance > 0 && cameraForward.dot(toRoomHorizontal) > 0.32;
        room.walls.forEach((wall) => {
          const material = wall.mesh?.material;
          if (!material) return;
          const baseOpacity = wall.baseOpacity ?? material.opacity ?? 1;
          let targetOpacity = baseOpacity;
          if (isInside) {
            targetOpacity = Math.min(targetOpacity, 0.08);
          } else if (lookingTowardRoom && horizontalDistance > 0) {
            const outsideAlignment = cameraHorizontal.dot(wall.normal);
            const viewAlignment = hasForward ? cameraForward.dot(wall.interiorNormal) : 0;
            if (outsideAlignment > 0.25 && viewAlignment > 0.35) {
              const distanceFactor = Math.max(0.2, Math.min(1, 1 - horizontalDistance / 80));
              const influence = viewAlignment * distanceFactor;
              const minOpacity = Math.min(baseOpacity, 0.16);
              targetOpacity = baseOpacity - (baseOpacity - minOpacity) * influence;
            }
          }
          material.opacity += (targetOpacity - material.opacity) * 0.2;
          material.opacity = THREE.MathUtils.clamp(material.opacity, 0.04, baseOpacity);
        });
      });
    };

    const setEnabled = (value) => {
      if (enabled === value) return;
      enabled = value;
      if (enabled) {
        if (animationId === null) {
          animationId = window.requestAnimationFrame(animate);
        }
      } else if (animationId !== null) {
        window.cancelAnimationFrame(animationId);
        animationId = null;
      }
    };

    const resize = (width, height) => {
      const safeWidth = Math.max(1, width);
      const safeHeight = Math.max(1, height);
      renderer.setSize(safeWidth, safeHeight, false);
      camera.aspect = safeWidth / safeHeight;
      camera.updateProjectionMatrix();
    };

    const resetCamera = () => {
      const span = Math.max(gridSize.width, gridSize.height);
      const distance = Math.max(18, span * 1.3);
      const height = Math.max(12, span * 0.9);
      const angle = Math.PI / 4;
      camera.position.set(Math.cos(angle) * distance, height, Math.sin(angle) * distance);
      controls.target.set(0, 0, 0);
      controls.update();
      defaultCameraSet = true;
    };

    const rotate = (delta) => {
      controls.rotateLeft(delta);
      controls.update();
    };

    const move = (forward = 0, strafe = 0) => {
      if (!forward && !strafe) {
        return;
      }
      forwardVector.subVectors(controls.target, camera.position);
      forwardVector.y = 0;
      if (forwardVector.lengthSq() < 1e-6) {
        forwardVector.set(0, 0, -1);
      } else {
        forwardVector.normalize();
      }
      rightVector.copy(forwardVector).cross(WORLD_UP).normalize();
      moveVector.copy(forwardVector).multiplyScalar(forward);
      moveVector.addScaledVector(rightVector, strafe);
      controls.target.add(moveVector);
      camera.position.add(moveVector);
      controls.update();
    };

    const elevate = (delta = 0) => {
      if (!delta) {
        return;
      }
      const newY = THREE.MathUtils.clamp(camera.position.y + delta, 4, 260);
      const diff = newY - camera.position.y;
      camera.position.y = newY;
      if (Math.abs(diff) > 1e-5) {
        controls.target.y = Math.max(-2, controls.target.y + diff * 0.12);
      }
      controls.update();
    };

    const zoomBy = (factor) => {
      if (factor > 1) {
        controls.dollyIn(factor);
      } else if (factor < 1) {
        controls.dollyOut(1 / factor);
      }
      controls.update();
    };

    const setGridSize = (width, height) => {
      gridSize = { width: Math.max(1, width), height: Math.max(1, height) };
      updateGround();
      if (!defaultCameraSet) {
        resetCamera();
      }
    };

    const updateScene = ({ grid, parcels, rooms, shells, agents } = {}) => {
      if (grid) {
        setGridSize(grid.width, grid.height);
      }
      if (Array.isArray(parcels)) {
        updateParcels(parcels);
      }
      if (Array.isArray(shells)) {
        updateShells(shells);
      }
      if (Array.isArray(rooms)) {
        updateRooms(rooms);
        updateRoomWallVisibility();
      }
      if (Array.isArray(agents)) {
        updateAgents(agents);
      }
    };

    return {
      isSupported: true,
      resize,
      setGridSize,
      updateScene,
      setEnabled,
      resetCamera,
      rotate,
      zoomBy,
      move,
      elevate,
      dispose: () => {
        setEnabled(false);
        controls.dispose();
        renderer.dispose();
        clearGroup(groundGroup);
        clearGroup(parcelGroup);
        clearGroup(shellGroup);
        clearGroup(roomGroup);
        clearGroup(agentGroup);
        roomInstances.length = 0;
      },
    };
  } catch (error) {
    console.warn("Three.js renderer initialization failed", error);
    return createFallbackRenderer();
  }
};

export default createThreeSceneRenderer;
