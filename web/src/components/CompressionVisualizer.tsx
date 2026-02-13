"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const CYAN = 0x00d4ff;
const BASE_RADIUS = 1.2;
const CONTRACTED_RADIUS = 0.35;
const IDLE_ROTATION = 0.08;
const ACTIVE_ROTATION = 0.25;

interface CompressionVisualizerProps {
  compressing: boolean;
  progress?: number;
}

export function CompressionVisualizer({
  compressing,
  progress = 0,
}: CompressionVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const compressingRef = useRef(compressing);
  compressingRef.current = compressing;
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    mesh: THREE.Group;
    initialPositions: THREE.Vector3[];
  } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.z = 3;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const geometry = new THREE.IcosahedronGeometry(BASE_RADIUS, 0);
    const positions = geometry.attributes.position;
    const initialPositions: THREE.Vector3[] = [];
    for (let i = 0; i < positions.count; i++) {
      initialPositions.push(
        new THREE.Vector3(
          positions.getX(i),
          positions.getY(i),
          positions.getZ(i)
        )
      );
    }

    const edges = new THREE.EdgesGeometry(geometry);
    const lineMat = new THREE.LineBasicMaterial({
      color: CYAN,
      transparent: true,
      opacity: 0.6,
    });
    const wireframe = new THREE.LineSegments(edges, lineMat);

    const pointsGeo = new THREE.BufferGeometry().setFromPoints(initialPositions);
    const pointsMat = new THREE.PointsMaterial({
      color: CYAN,
      size: 0.08,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(pointsGeo, pointsMat);

    const group = new THREE.Group();
    group.add(wireframe);
    group.add(points);
    scene.add(group);

    sceneRef.current = {
      scene,
      camera,
      renderer,
      mesh: group,
      initialPositions,
    };

    const handleResize = () => {
      if (!containerRef.current || !sceneRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      sceneRef.current.camera.aspect = w / h;
      sceneRef.current.camera.updateProjectionMatrix();
      sceneRef.current.renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    let animationId: number;
    let contractT = 0;
    let rotationSpeed = IDLE_ROTATION;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const ref = sceneRef.current;
      if (!ref) return;

      const isCompressing = compressingRef.current;
      const targetContract = isCompressing ? 1 : 0;
      contractT += (targetContract - contractT) * 0.06;
      const r = THREE.MathUtils.lerp(BASE_RADIUS, CONTRACTED_RADIUS, contractT);
      rotationSpeed +=
        ((isCompressing ? ACTIVE_ROTATION : IDLE_ROTATION) - rotationSpeed) * 0.05;

      ref.mesh.rotation.y += rotationSpeed * 0.01;
      ref.mesh.rotation.x += rotationSpeed * 0.004;

      const posAttr = (ref.mesh.children[1] as THREE.Points).geometry
        .attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < ref.initialPositions.length; i++) {
        const init = ref.initialPositions[i];
        const scale = init.length() > 0 ? r / init.length() : 1;
        posAttr.setXYZ(
          i,
          init.x * scale,
          init.y * scale,
          init.z * scale
        );
      }
      posAttr.needsUpdate = true;

      const wireframeChild = ref.mesh.children[0] as THREE.LineSegments;
      wireframeChild.geometry.dispose();
      const newGeo = new THREE.IcosahedronGeometry(r, 0);
      const newEdges = new THREE.EdgesGeometry(newGeo);
      wireframeChild.geometry = newEdges;
      newGeo.dispose();

      const lineMat = wireframeChild.material as THREE.LineBasicMaterial;
      lineMat.opacity = isCompressing ? 0.85 : 0.5;

      ref.renderer.render(ref.scene, ref.camera);
    };
    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      edges.dispose();
      pointsGeo.dispose();
      lineMat.dispose();
      pointsMat.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current) return;
    const pointsMat = (sceneRef.current.mesh.children[1] as THREE.Points)
      .material as THREE.PointsMaterial;
    pointsMat.opacity = compressing ? 0.95 : 0.7;
  }, [compressing]);

  return (
    <div
      className="absolute inset-0 z-[1] pointer-events-none flex items-center justify-center"
      aria-hidden
    >
      <div ref={containerRef} className="h-[280px] w-[280px]" />
    </div>
  );
}
