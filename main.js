import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import * as Imagesloaded from 'imagesloaded'
import * as Fontfaceobserver from 'fontfaceobserver'
import gsap from 'gsap'

import Scroll from './scroll'
import bg from './assets/bg.jpeg'
import noise from './shaders/noise.glsl?raw'
import imageFragmentShader from './shaders/image/fragment.frag?raw'
import imageVertexShader from './shaders/image/vertex.vert?raw'

import './style.css'

export default class Sketch {
  constructor(options) {
    this.container = options.dom
    this.windowSize = new THREE.Vector2(window.innerWidth, window.innerHeight)
    this.pointer = new THREE.Vector2()

    this.scene = new THREE.Scene()
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
    })
    this.renderer.setClearColor(0xffffff)

    this.container.appendChild(this.renderer.domElement)

    this.clock = new THREE.Clock()

    const fontOpenSans = new Promise(res => {
      new Fontfaceobserver('Open Sans').load().then(res)
    })
    const fontPlayfair = new Promise(res => {
      new Fontfaceobserver('Playfair Display').load().then(res)
    })
    const preloadImages = new Promise(res => {
      new Imagesloaded(
        document.querySelectorAll('img'),
        { background: true },
        res,
      )
    })

    Promise.all([fontOpenSans, fontPlayfair, preloadImages]).then(() => {
      this.scroll = new Scroll()
      this.addCamera()
      this.addListeners()

      this.initRaycast()
      this.initImages()
      this.positionImages()

      this.composerPass()
      this.resize()
      this.render()
    })
  }

  getFOV() {
    return (
      2 *
      THREE.MathUtils.radToDeg(
        Math.atan(this.windowSize.y / 2 / this.cameraLocationZ),
      )
    )
  }

  addCamera() {
    this.cameraLocationZ = 600
    this.camera = new THREE.PerspectiveCamera(
      this.getFOV(),
      this.windowSize.x / this.windowSize.y,
      100,
      2000,
    )
    this.camera.position.set(0, 0, this.cameraLocationZ)

    this.scene.add(this.camera)
  }

  initRaycast() {
    this.raycaster = new THREE.Raycaster()
  }

  initImages() {
    this.images = [...document.querySelectorAll('img')]
    this.material = new THREE.ShaderMaterial({
      fragmentShader: imageFragmentShader,
      vertexShader: imageVertexShader,
      uniforms: {
        uTime: { value: 0 },
        uImage: { value: null },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uHovered: { value: 0 },
        uProgress: { value: 0 },
      },
    })
    this.imageStore = this.images.map(img => {
      const rect = img.getBoundingClientRect()
      const attrWidth = Number(img.getAttribute('width'))

      const texture = new THREE.Texture(img)
      texture.needsUpdate = true
      const geometry = new THREE.PlaneBufferGeometry(
        attrWidth ?? rect.width,
        rect.height,
        10,
        10,
      )
      const material = this.material.clone()
      material.uniforms.uImage.value = texture

      const mesh = new THREE.Mesh(geometry, material)
      this.scene.add(mesh)

      img.addEventListener('mouseenter', () => {
        gsap.to(material.uniforms.uHovered, {
          value: 1,
          ease: 'power2.inOut',
          duration: 1,
        })
        gsap.to(material.uniforms.uProgress, {
          value: 1,
          ease: 'power2.inOut',
          duration: 1,
        })
      })

      img.addEventListener('mouseleave', () => {
        gsap.to(material.uniforms.uHovered, {
          value: 0,
          ease: 'power2.inOut',
          duration: 1,
        })
        gsap.set(material.uniforms.uProgress, {
          value: 0,
        })
      })

      return {
        img,
        geometry,
        material,
        mesh,
        rect,
      }
    })
  }

  positionImages() {
    this.imageStore.forEach(image => {
      const attrWidth = Number(image.img.getAttribute('width'))

      image.mesh.position.y =
        this.scroll.scrollToRender +
        -image.rect.top +
        this.windowSize.y / 2 -
        image.rect.height / 2
      image.mesh.position.x =
        image.rect.left -
        this.windowSize.x / 2 +
        (attrWidth ?? image.rect.width) / 2
    })
  }

  cleanImages() {
    this.imageStore.forEach(({ mesh }) => {
      this.scene.remove(mesh)
    })
  }

  composerPass() {
    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))

    this.effect = {
      uniforms: {
        uTime: { value: 0 },
        tDiffuse: { value: null },
        uScrollSpeed: { value: 0 },
      },
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uScrollSpeed;
        uniform float uTime;

        varying vec2 vUv;

        ${noise}

        void main() {
          vec2 newUv = vUv;

          float area = smoothstep(1., .8, vUv.y) * 2. - 1.;
          float noise = .5 * (cnoise(vec3(vUv * 10., uTime)) + 1.) ;
          float n = smoothstep(.5, .51, noise + area);
          newUv.x -= (vUv.x - 0.5) * .1 * area * uScrollSpeed;

          vec4 map = texture2D(tDiffuse, newUv);

          gl_FragColor = map;
          gl_FragColor = vec4(n, 0., 0., 1.);
          gl_FragColor = mix(vec4(1.), map, n);
        }
      `,
      vertexShader: `
        varying vec2 vUv;

        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
          vUv = uv;
        }
      `,
    }

    this.pass = new ShaderPass(this.effect)
    this.composer.addPass(this.pass)
  }

  resize() {
    this.windowSize.set(window.innerWidth, window.innerHeight)

    this.camera.aspect = this.windowSize.x / this.windowSize.y
    this.camera.fov = this.getFOV()
    this.camera.updateProjectionMatrix()

    this.cleanImages()
    this.initImages()
    this.positionImages()

    this.composer.setSize(this.windowSize.x, this.windowSize.y)
    this.renderer.setSize(this.windowSize.x, this.windowSize.y)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  }

  onPointerMove(event) {
    this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1
    this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1
  }

  addListeners() {
    window.addEventListener('resize', this.resize.bind(this))
    window.addEventListener('pointermove', this.onPointerMove.bind(this))
  }

  render() {
    const elapsedTime = this.clock.getElapsedTime()

    this.raycaster.setFromCamera(this.pointer, this.camera)
    const intersects = this.raycaster.intersectObjects(this.scene.children)

    if (intersects.length > 0) {
      intersects[0].object.material.uniforms.uMouse.value = intersects[0].uv
    }

    this.pass.uniforms.uTime.value = elapsedTime
    this.pass.uniforms.uScrollSpeed.value = this.scroll.speedTarget

    this.imageStore.forEach(image => {
      image.material.uniforms.uTime.value = elapsedTime
    })

    this.scroll.render()
    this.positionImages()
    this.composer.render()

    window.requestAnimationFrame(this.render.bind(this))
  }
}
new Sketch({ dom: document.getElementById('container') })
