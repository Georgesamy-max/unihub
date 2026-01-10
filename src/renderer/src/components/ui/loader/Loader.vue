<template>
  <div class="loader-container">
    <div class="loader-wrapper">
      <div class="loader">
        <span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </span>
        <div class="base">
          <span></span>
          <div class="face"></div>
        </div>
      </div>
      <div class="longfazers">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
    <p v-if="text" class="loader-text">{{ text }}</p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  text?: string
}

defineProps<Props>()
</script>

<style scoped>
.loader-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  gap: 2rem;
}

.loader-wrapper {
  position: relative;
  width: 250px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loader {
  position: absolute;
  left: 50%;
  top: 50%;
  margin-left: -50px;
  margin-top: -10px;
  animation: speeder 0.4s linear infinite;
}

.loader > span {
  height: 5px;
  width: 35px;
  background: #1f2937;
  position: absolute;
  top: -19px;
  left: 60px;
  border-radius: 2px 10px 1px 0;
}

.dark .loader > span {
  background: #f3f4f6;
}

.base span {
  position: absolute;
  width: 0;
  height: 0;
  border-top: 6px solid transparent;
  border-right: 100px solid #1f2937;
  border-bottom: 6px solid transparent;
}

.dark .base span {
  border-right-color: #f3f4f6;
}

.base span:before {
  content: '';
  height: 22px;
  width: 22px;
  border-radius: 50%;
  background: #1f2937;
  position: absolute;
  right: -110px;
  top: -16px;
}

.dark .base span:before {
  background: #f3f4f6;
}

.base span:after {
  content: '';
  position: absolute;
  width: 0;
  height: 0;
  border-top: 0 solid transparent;
  border-right: 55px solid #1f2937;
  border-bottom: 16px solid transparent;
  top: -16px;
  right: -98px;
}

.dark .base span:after {
  border-right-color: #f3f4f6;
}

.face {
  position: absolute;
  height: 12px;
  width: 20px;
  background: #1f2937;
  border-radius: 20px 20px 0 0;
  transform: rotate(-40deg);
  right: -125px;
  top: -15px;
}

.dark .face {
  background: #f3f4f6;
}

.face:after {
  content: '';
  height: 12px;
  width: 12px;
  background: #1f2937;
  right: 4px;
  top: 7px;
  position: absolute;
  transform: rotate(40deg);
  transform-origin: 50% 50%;
  border-radius: 0 0 0 2px;
}

.dark .face:after {
  background: #f3f4f6;
}

.loader > span > span:nth-child(1),
.loader > span > span:nth-child(2),
.loader > span > span:nth-child(3),
.loader > span > span:nth-child(4) {
  width: 30px;
  height: 1px;
  background: #1f2937;
  position: absolute;
  animation: fazer1 0.2s linear infinite;
}

.dark .loader > span > span {
  background: #f3f4f6;
}

.loader > span > span:nth-child(2) {
  top: 3px;
  animation: fazer2 0.4s linear infinite;
}

.loader > span > span:nth-child(3) {
  top: 1px;
  animation: fazer3 0.4s linear infinite;
  animation-delay: -1s;
}

.loader > span > span:nth-child(4) {
  top: 4px;
  animation: fazer4 1s linear infinite;
  animation-delay: -1s;
}

@keyframes fazer1 {
  0% {
    left: 0;
  }
  100% {
    left: -80px;
    opacity: 0;
  }
}

@keyframes fazer2 {
  0% {
    left: 0;
  }
  100% {
    left: -100px;
    opacity: 0;
  }
}

@keyframes fazer3 {
  0% {
    left: 0;
  }
  100% {
    left: -50px;
    opacity: 0;
  }
}

@keyframes fazer4 {
  0% {
    left: 0;
  }
  100% {
    left: -150px;
    opacity: 0;
  }
}

@keyframes speeder {
  0% {
    transform: translate(2px, 1px) rotate(0deg);
  }
  10% {
    transform: translate(-1px, -3px) rotate(-1deg);
  }
  20% {
    transform: translate(-2px, 0px) rotate(1deg);
  }
  30% {
    transform: translate(1px, 2px) rotate(0deg);
  }
  40% {
    transform: translate(1px, -1px) rotate(1deg);
  }
  50% {
    transform: translate(-1px, 3px) rotate(-1deg);
  }
  60% {
    transform: translate(-1px, 1px) rotate(0deg);
  }
  70% {
    transform: translate(3px, 1px) rotate(-1deg);
  }
  80% {
    transform: translate(-2px, -1px) rotate(1deg);
  }
  90% {
    transform: translate(2px, 1px) rotate(0deg);
  }
  100% {
    transform: translate(1px, -2px) rotate(-1deg);
  }
}

.longfazers {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  overflow: hidden;
}

.longfazers span {
  position: absolute;
  height: 2px;
  width: 20%;
  background: #1f2937;
}

.dark .longfazers span {
  background: #f3f4f6;
}

.longfazers span:nth-child(1) {
  top: 20%;
  animation: lf 0.6s linear infinite;
  animation-delay: -5s;
}

.longfazers span:nth-child(2) {
  top: 40%;
  animation: lf2 0.8s linear infinite;
  animation-delay: -1s;
}

.longfazers span:nth-child(3) {
  top: 60%;
  animation: lf3 0.6s linear infinite;
}

.longfazers span:nth-child(4) {
  top: 80%;
  animation: lf4 0.5s linear infinite;
  animation-delay: -3s;
}

@keyframes lf {
  0% {
    left: 200%;
  }
  100% {
    left: -200%;
    opacity: 0;
  }
}

@keyframes lf2 {
  0% {
    left: 200%;
  }
  100% {
    left: -200%;
    opacity: 0;
  }
}

@keyframes lf3 {
  0% {
    left: 200%;
  }
  100% {
    left: -100%;
    opacity: 0;
  }
}

@keyframes lf4 {
  0% {
    left: 200%;
  }
  100% {
    left: -100%;
    opacity: 0;
  }
}

.loader-text {
  font-size: 0.875rem;
  color: #6b7280;
  text-align: center;
}

.dark .loader-text {
  color: #9ca3af;
}
</style>
