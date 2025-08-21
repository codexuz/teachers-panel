<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

const word = ref(props.modelValue.word || '')
const audioMode = ref(props.modelValue.audioMode || 'audioUrl')
const audioUrl = ref(props.modelValue.audioUrl || `https://ssl.gstatic.com/dictionary/static/sounds/oxford/${word.value}--_gb_1.mp3`)
const audioStream = ref(props.modelValue.audioStream || `https://impulselc.uz/api/v1/tts?lang=en-au&text=${word.value}`)

watch([word, audioMode, audioUrl, audioStream], () => {
  emit('update:modelValue', {
    ...props.modelValue,
    type: 'pronunciation',
    word: word.value,
    audioMode: audioMode.value,
    audioUrl: audioUrl.value,
    audioStream: audioStream.value
  })
})
</script>

<template>
  <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">Word</label>
      <input v-model="word" type="text"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Enter the word to pronounce" />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">Audio Source</label>
      <div class="flex gap-4 mb-4">
        <label class="inline-flex items-center">
          <input type="radio" v-model="audioMode" value="audioUrl" class="form-radio text-blue-500">
          <span class="ml-2">Audio URL</span>
        </label>
        <label class="inline-flex items-center">
          <input type="radio" v-model="audioMode" value="audioStream" class="form-radio text-blue-500">
          <span class="ml-2">Audio Stream</span>
        </label>
      </div>

      <div v-if="audioMode === 'audioUrl'">
        <input v-model="audioUrl" type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter audio URL" />
      </div>

      <div v-else>
        <input v-model="audioStream" type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter audio stream URL" />
      </div>
    </div>

    <div>
      <div class="flex items-center gap-3">
        <audio v-if="audioMode === 'audioUrl' && audioUrl" :src="audioUrl" controls class="h-8"></audio>
        <audio v-if="audioMode === 'audioStream' && audioStream" :src="audioStream" controls class="h-8"></audio>
      </div>
    </div>
  </div>
</template>
