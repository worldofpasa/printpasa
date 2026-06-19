<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import type { BadgeVariants } from "@/lib/ui/badge"
import { cn } from "@/lib/utils"
import { badgeVariants } from "@/lib/ui/badge"

const props = defineProps<{
  variant?: BadgeVariants["variant"]
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <span :class="cn(badgeVariants({ variant }), props.class)">
    <slot />
  </span>
</template>
