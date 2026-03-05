import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, Html } from '@react-three/drei';
import { Suspense, useEffect, useState, useRef, useMemo } from 'react';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import * as THREE from 'three';

function Model({ url, fileType = 'gltf', onLoaded, onHasAnimation }) {
  const [scene, setScene] = useState(null);
  const [error, setError] = useState(null);
  const mixerRef = useRef(null);
  const { camera } = useThree();

  useFrame((_, delta) => {
    mixerRef.current?.update(delta);
  });

  useEffect(() => {
    setScene(null);
    setError(null);
    mixerRef.current?.stopAllAction();
    mixerRef.current = null;

    const isFbx = fileType === 'fbx';
    const loader = isFbx ? new FBXLoader() : new GLTFLoader();

    loader.load(
      url,
      (loaded) => {
        // GLTFLoader returns { scene, animations }, FBXLoader returns Object3D directly
        const s = isFbx ? loaded : loaded.scene;
        const animations = isFbx ? loaded.animations : loaded.animations;

        // Auto-center and scale
        const box = new THREE.Box3().setFromObject(s);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;

        s.scale.setScalar(scale);
        s.position.sub(center.multiplyScalar(scale));
        s.position.y -= box.min.y * scale;

        camera.position.set(3, 2, 3);
        camera.lookAt(0, 0, 0);

        if (animations?.length > 0) {
          const mixer = new THREE.AnimationMixer(s);
          animations.forEach(clip => mixer.clipAction(clip).play());
          mixerRef.current = mixer;
          onHasAnimation?.(true);
        } else {
          onHasAnimation?.(false);
        }

        setScene(s);
        onLoaded?.();
      },
      undefined,
      (err) => {
        console.error('Model load error:', err);
        setError('无法加载3D模型');
      }
    );

    return () => {
      mixerRef.current?.stopAllAction();
      mixerRef.current = null;
    };
  }, [url, fileType, camera, onLoaded, onHasAnimation]);

  if (error) {
    return (
      <Html center>
        <div className="text-red-400 text-center bg-gray-900/90 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      </Html>
    );
  }

  if (!scene) {
    return (
      <Html center>
        <div className="text-indigo-400 text-center">
          <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span className="text-sm">加载模型中...</span>
        </div>
      </Html>
    );
  }

  return <primitive object={scene} />;
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <directionalLight position={[-3, 2, -3]} intensity={0.3} />
    </>
  );
}

export default function ModelViewer({ modelUrl, label, fileType = 'gltf' }) {
  const [autoRotate, setAutoRotate] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [viewMode, setViewMode] = useState('standard');
  const [loaded, setLoaded] = useState(false);
  const [hasAnimation, setHasAnimation] = useState(false);

  const proxiedUrl = useMemo(() => modelUrl, [modelUrl]);

  // Reset state when URL changes
  useEffect(() => {
    setLoaded(false);
    setHasAnimation(false);
    setAutoRotate(true);
  }, [modelUrl]);

  if (!modelUrl) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900/60">
        <div className="flex items-center gap-2">
          {label && (
            <span className="text-xs text-indigo-400 font-medium px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
              {label}
            </span>
          )}
          {hasAnimation && (
            <span className="text-xs text-emerald-400 font-medium px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 animate-pulse">
              ▶ 动画播放中
            </span>
          )}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-3 py-1 text-xs rounded-md transition ${
              autoRotate ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            自动旋转
          </button>
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-3 py-1 text-xs rounded-md transition ${
              showGrid ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            网格
          </button>
        </div>
        <div className="flex gap-1 bg-gray-800 rounded-md p-0.5">
          {['standard', 'wireframe'].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 text-xs rounded capitalize transition ${
                viewMode === mode ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {mode === 'standard' ? '实体' : '线框'}
            </button>
          ))}
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 relative overflow-hidden bg-gray-950">
        <Canvas
          camera={{ position: [3, 2, 3], fov: 45, near: 0.01, far: 1000 }}
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
        >
          <Suspense fallback={null}>
            <Lights />
            <Environment preset="city" />

            {showGrid && (
              <Grid
                args={[10, 10]}
                cellSize={0.5}
                cellThickness={0.5}
                cellColor="#1e293b"
                sectionSize={2}
                sectionThickness={1}
                sectionColor="#334155"
                fadeDistance={10}
                fadeStrength={1}
                position={[0, -0.01, 0]}
              />
            )}

            <Model
              url={proxiedUrl}
              fileType={fileType}
              onLoaded={() => setLoaded(true)}
              onHasAnimation={setHasAnimation}
            />

            <OrbitControls
              autoRotate={autoRotate}
              autoRotateSpeed={hasAnimation ? 0.5 : 2}
              enableDamping
              dampingFactor={0.05}
              minDistance={0.5}
              maxDistance={20}
            />
          </Suspense>
        </Canvas>

        {loaded && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-gray-500 bg-gray-900/80 px-3 py-1 rounded-full pointer-events-none whitespace-nowrap">
            左键拖拽旋转 · 滚轮缩放 · 右键平移
          </div>
        )}
      </div>
    </div>
  );
}
