<script setup>
import { ref, reactive, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  speakingAPI,
  ieltsPart1API,
  uploadAPI,
  speakingResponsesAPI,
} from "@/utils/api.js";

// Shadcn Components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Lucide Icons
import {
  Plus,
  Edit,
  Trash2,
  Mic,
  Volume2,
  Image as ImageIcon,
  FileAudio,
  ArrowLeft,
  MoreHorizontal,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  Users,
  Upload,
  X,
} from "lucide-vue-next";

const route = useRoute();
const router = useRouter();

const isLoading = ref(false);
const error = ref("");
const showModal = ref(false);
const modalType = ref(""); // 'part1', 'part2', 'part3'
const isEditMode = ref(false);

// Grade and view modals
const showGradeModal = ref(false);
const showViewModal = ref(false);
const selectedResponse = ref(null);
const gradeForm = reactive({
  pronunciation_score: "",
});

// Upload states
const isUploading = ref(false);
const uploadProgress = ref(0);
const selectedFile = ref(null);
const fileInputKey = ref(0); // For resetting file input

// Data
const speakingExercise = ref(null);
const part1Questions = ref([]);
const studentResponses = ref([]);

// Form data for different types
const part1Form = reactive({
  id: null,
  speaking_id: null,
  question: "",
  type: "part_1.1",
  image_url: "",
  image_file: null,
  audio_url: "",
  audio_file: null,
  sample_answer: "",
});

// Part 1 types
const part1Types = [
  { value: "part_1.1", label: "Part 1.1" },
  { value: "part_1.2", label: "Part 1.2" },
];

// Computed properties

// File upload methods
const handleFileSelect = (event, type) => {
  const file = event.target.files[0];
  if (!file) return;

  selectedFile.value = { file, type };
};

const uploadFile = async (file, type) => {
  try {
    isUploading.value = true;
    uploadProgress.value = 0;

    const result = await uploadAPI.uploadFile(file, {
      onUploadProgress: (event) => {
        if (event.lengthComputable) {
          uploadProgress.value = Math.round((event.loaded / event.total) * 100);
        }
      },
    });

    return result.url || result.file_url || result.path;
  } catch (err) {
    console.error("Upload error:", err);
    throw new Error("Failed to upload file");
  } finally {
    isUploading.value = false;
    uploadProgress.value = 0;
  }
};

const removeFile = (formObj, field) => {
  formObj[field] = null;
  selectedFile.value = null;
  fileInputKey.value += 1; // Reset file input
};

// Methods
const getScoreVariant = (score) => {
  if (score >= 80) return "default";
  if (score >= 60) return "secondary";
  return "destructive";
};

const getAverageScore = (result) => {
  if (!result) return 0;
  const scores = [
    result.fluency || 0,
    result.grammar || 0,
    result.vocabulary || 0,
    result.pronunciation || 0,
  ];
  const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return Math.round(avg);
};

const viewResponse = (response) => {
  selectedResponse.value = response;
  showViewModal.value = true;
};

const gradeResponse = (response) => {
  selectedResponse.value = response;
  gradeForm.pronunciation_score = response.pronunciation_score || "";
  showGradeModal.value = true;
};

const deleteResponse = async (response) => {
  if (
    !confirm(
      `Are you sure you want to delete ${response.student?.first_name} ${response.student?.last_name}'s response?`
    )
  ) {
    return;
  }

  try {
    isLoading.value = true;
    error.value = "";

    await speakingResponsesAPI.delete(response.id);

    // Remove from local array
    studentResponses.value = studentResponses.value.filter(
      (r) => r.id !== response.id
    );
  } catch (err) {
    error.value = "Failed to delete student response";
    console.error("Error deleting response:", err);
  } finally {
    isLoading.value = false;
  }
};

const submitGrade = async () => {
  try {
    isLoading.value = true;
    error.value = "";

    if (!gradeForm.pronunciation_score) {
      error.value = "Please enter a pronunciation score";
      return;
    }

    const score = parseFloat(gradeForm.pronunciation_score);
    if (isNaN(score) || score < 0 || score > 100) {
      error.value = "Score must be a number between 0 and 100";
      return;
    }

    await speakingResponsesAPI.update(selectedResponse.value.id, {
      pronunciation_score: score,
    });

    // Refresh the student responses
    await fetchStudentResponses();

    // Close modal and reset
    showGradeModal.value = false;
    selectedResponse.value = null;
    gradeForm.pronunciation_score = "";
  } catch (err) {
    error.value = "Failed to update grade";
    console.error("Error updating grade:", err);
  } finally {
    isLoading.value = false;
  }
};

const closeGradeModal = () => {
  showGradeModal.value = false;
  selectedResponse.value = null;
  gradeForm.pronunciation_score = "";
};

const closeViewModal = () => {
  showViewModal.value = false;
  selectedResponse.value = null;
};

const fetchSpeakingExercise = async () => {
  try {
    const speakingId = route.params.id;
    if (!speakingId) return;

    isLoading.value = true;
    error.value = "";

    const response = await speakingAPI.getById(speakingId);
    speakingExercise.value = response;

    // Fetch related exercises
    await Promise.all([fetchPart1Questions(), fetchStudentResponses()]);
  } catch (err) {
    error.value = "Failed to fetch speaking exercise details";
    console.error("Error fetching speaking exercise:", err);
  } finally {
    isLoading.value = false;
  }
};

const fetchPart1Questions = async () => {
  try {
    const speakingId = route.params.id;
    const response = await ieltsPart1API.getBySpeakingId(speakingId);
    part1Questions.value = response || [];
  } catch (err) {
    console.error("Error fetching Part 1 questions:", err);
  }
};

const fetchStudentResponses = async () => {
  try {
    const speakingId = route.params.id;
    const response = await speakingResponsesAPI.getBySpeakingId(speakingId);
    // The API returns an array directly based on the provided structure
    studentResponses.value = Array.isArray(response.data)
      ? response.data
      : Array.isArray(response)
      ? response
      : [];
  } catch (err) {
    console.error("Error fetching student responses:", err);
    studentResponses.value = [];
  }
};

const resetForms = () => {
  // Reset part1 form
  Object.assign(part1Form, {
    id: null,
    speaking_id: route.params.id,
    question: "",
    type: "part_1.1",
    image_url: "",
    image_file: null,
    audio_url: "",
    audio_file: null,
    sample_answer: "",
  });

  // Reset file states
  selectedFile.value = null;
  fileInputKey.value += 1;
};

const openModal = (type) => {
  resetForms();
  modalType.value = type;
  isEditMode.value = false;
  showModal.value = true;
};

const openEditModal = (type, item) => {
  modalType.value = type;
  isEditMode.value = true;

  if (type === "part1") {
    Object.assign(part1Form, item);
  }

  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  resetForms();
  modalType.value = "";
  isEditMode.value = false;
};

const submitForm = async () => {
  try {
    isLoading.value = true;
    error.value = "";

    if (modalType.value === "part1") {
      if (!part1Form.question.trim()) {
        error.value = "Please fill in all required fields";
        return;
      }

      // Handle file uploads
      let imageUrl = part1Form.image_url;
      let audioUrl = part1Form.audio_url;

      if (part1Form.image_file) {
        imageUrl = await uploadFile(part1Form.image_file, "image");
      }
      if (part1Form.audio_file) {
        audioUrl = await uploadFile(part1Form.audio_file, "audio");
      }

      const formData = {
        speaking_id: part1Form.speaking_id,
        question: part1Form.question.trim(),
        type: part1Form.type,
        image_url: imageUrl?.trim() || "",
        audio_url: audioUrl?.trim() || "",
        sample_answer: part1Form.sample_answer?.trim() || "",
      };

      const apiCall = isEditMode.value
        ? ieltsPart1API.update(part1Form.id, formData)
        : ieltsPart1API.create(formData);

      await apiCall;
      await fetchPart1Questions();
    }

    closeModal();
  } catch (err) {
    error.value = `Failed to ${isEditMode.value ? "update" : "create"} ${
      modalType.value
    }`;
    console.error("Error submitting form:", err);
  } finally {
    isLoading.value = false;
  }
};

const deleteItem = async (type, id) => {
  if (!confirm(`Are you sure you want to delete this ${type}?`)) return;

  try {
    isLoading.value = true;
    error.value = "";

    if (type === "part1") {
      await ieltsPart1API.delete(id);
      await fetchPart1Questions();
    }
  } catch (err) {
    error.value = `Failed to delete ${type}`;
    console.error(`Error deleting ${type}:`, err);
  } finally {
    isLoading.value = false;
  }
};

const goBack = () => {
  router.push("/speaking");
};

const getModalTitle = () => {
  const action = isEditMode.value ? "Edit" : "Add";
  if (modalType.value === "part1") {
    return `${action} IELTS Part 1 Question`;
  }
  return action;
};

// Initialize data
onMounted(() => {
  fetchSpeakingExercise();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <Button
          variant="outline"
          @click="goBack"
          class="flex items-center gap-2"
        >
          <ArrowLeft class="w-4 h-4" />
          Back to Speaking
        </Button>
        <div>
          <h1 class="text-3xl font-bold tracking-tight">
            {{ speakingExercise?.title || "Speaking Exercise Details" }}
          </h1>
          <p class="text-muted-foreground">
            Manage IELTS speaking questions and view student responses
          </p>
        </div>
      </div>
    </div>

    <!-- Error Alert -->
    <Alert v-if="error" variant="destructive" class="mb-6">
      <AlertCircle class="w-4 h-4" />
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <!-- Speaking Exercise Info -->
    <Card v-if="speakingExercise">
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Mic class="w-5 h-5" />
          {{ speakingExercise.title }}
        </CardTitle>
        <CardDescription>
          Type:
          <Badge variant="secondary" class="ml-2 capitalize">
            {{ speakingExercise.type }}
          </Badge>
        </CardDescription>
      </CardHeader>
    </Card>

    <!-- Content Tabs -->
    <Tabs default-value="questions" class="w-full">
      <TabsList class="grid w-full grid-cols-2">
        <TabsTrigger value="questions" class="flex items-center gap-2">
          <MessageSquare class="w-4 h-4" />
          Questions
        </TabsTrigger>
        <TabsTrigger value="responses" class="flex items-center gap-2">
          <Users class="w-4 h-4" />
          Student Responses
        </TabsTrigger>
      </TabsList>

      <!-- Questions Tab -->
      <TabsContent value="questions">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center justify-between">
              <span>IELTS Part 1 Questions</span>
              <Button
                @click="openModal('part1')"
                class="flex items-center gap-2"
              >
                <Plus class="w-4 h-4" />
                Add Part 1 Question
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div v-if="isLoading" class="space-y-3">
              <Skeleton v-for="i in 3" :key="i" class="h-16 w-full" />
            </div>

            <div
              v-else-if="part1Questions.length === 0"
              class="text-center py-8"
            >
              <MessageSquare class="mx-auto w-12 h-12 text-gray-400 mb-4" />
              <p class="text-lg font-medium text-gray-900">
                No Part 1 questions
              </p>
              <p class="text-gray-600">Add your first Part 1 question.</p>
            </div>

            <Table v-else>
              <TableHeader>
                <TableRow>
                  <TableHead>Question</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Media</TableHead>
                  <TableHead>Sample Answer</TableHead>
                  <TableHead class="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="question in part1Questions" :key="question.id">
                  <TableCell class="font-medium max-w-md">
                    {{ question.question.substring(0, 80) }}...
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{{ question.type }}</Badge>
                  </TableCell>
                  <TableCell>
                    <div class="flex gap-1">
                      <Badge
                        v-if="question.image_url"
                        variant="secondary"
                        class="text-xs"
                      >
                        <ImageIcon class="w-3 h-3 mr-1" />
                        Image
                      </Badge>
                      <Badge
                        v-if="question.audio_url"
                        variant="secondary"
                        class="text-xs"
                      >
                        <FileAudio class="w-3 h-3 mr-1" />
                        Audio
                      </Badge>
                      <span
                        v-if="!question.image_url && !question.audio_url"
                        class="text-muted-foreground text-xs"
                      >
                        No media
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge v-if="question.sample_answer" variant="secondary"
                      >Available</Badge
                    >
                    <span v-else class="text-muted-foreground">No sample</span>
                  </TableCell>
                  <TableCell class="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" class="h-8 w-8 p-0">
                          <MoreHorizontal class="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          @click="openEditModal('part1', question)"
                        >
                          <Edit class="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          @click="deleteItem('part1', question.id)"
                          class="text-red-600"
                        >
                          <Trash2 class="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- Student Responses Tab -->
      <TabsContent value="responses">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <Users class="w-5 h-5" />
              Student Responses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div v-if="isLoading" class="space-y-3">
              <Skeleton v-for="i in 3" :key="i" class="h-16 w-full" />
            </div>

            <div
              v-else-if="studentResponses.length === 0"
              class="text-center py-8"
            >
              <Users class="mx-auto w-12 h-12 text-gray-400 mb-4" />
              <p class="text-lg font-medium text-gray-900">
                No student responses
              </p>
              <p class="text-gray-600">
                No students have submitted responses yet.
              </p>
            </div>

            <Table v-else>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Response Type</TableHead>
                  <TableHead>Transcription</TableHead>
                  <TableHead>Submitted At</TableHead>
                  <TableHead>Overall Score</TableHead>
                  <TableHead class="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="response in studentResponses"
                  :key="response.id"
                >
                  <TableCell class="font-medium">
                    <div>
                      <p class="font-medium">
                        {{ response.student?.first_name }}
                        {{ response.student?.last_name }}
                      </p>
                      <p class="text-sm text-muted-foreground">
                        {{ response.student?.username }}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" class="capitalize">
                      {{ response.response_type || "Audio" }}
                    </Badge>
                  </TableCell>
                  <TableCell class="max-w-md">
                    <p class="truncate text-sm" :title="response.transcription">
                      {{
                        response.transcription
                          ? response.transcription.substring(0, 80) + "..."
                          : "No transcription"
                      }}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div class="text-sm">
                      {{
                        response.createdAt
                          ? new Date(response.createdAt).toLocaleDateString()
                          : "N/A"
                      }}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div v-if="response.result" class="space-y-1">
                      <div class="flex flex-wrap gap-1">
                        <Badge variant="outline" class="text-xs">
                          F: {{ response.result.fluency || 0 }}
                        </Badge>
                        <Badge variant="outline" class="text-xs">
                          G: {{ response.result.grammar || 0 }}
                        </Badge>
                        <Badge variant="outline" class="text-xs">
                          V: {{ response.result.vocabulary || 0 }}
                        </Badge>
                        <Badge variant="outline" class="text-xs">
                          P: {{ response.result.pronunciation || 0 }}
                        </Badge>
                      </div>
                      <div class="text-xs text-muted-foreground">
                        Avg: {{ getAverageScore(response.result) }}%
                      </div>
                    </div>
                    <div
                      v-else-if="response.pronunciation_score"
                      class="text-center"
                    >
                      <Badge
                        :variant="
                          getScoreVariant(
                            parseFloat(response.pronunciation_score)
                          )
                        "
                      >
                        {{
                          parseFloat(response.pronunciation_score).toFixed(0)
                        }}%
                      </Badge>
                      <div class="text-xs text-muted-foreground">
                        Pronunciation
                      </div>
                    </div>
                    <span v-else class="text-muted-foreground">Not scored</span>
                  </TableCell>
                  <TableCell class="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" class="h-8 w-8 p-0">
                          <MoreHorizontal class="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem @click="viewResponse(response)">
                          <Volume2 class="w-4 h-4 mr-2" />
                          View Response
                        </DropdownMenuItem>
                        <DropdownMenuItem @click="gradeResponse(response)">
                          <Edit class="w-4 h-4 mr-2" />
                          Grade
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          @click="deleteResponse(response)"
                          class="text-red-600"
                        >
                          <Trash2 class="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    <!-- Modal for Adding/Editing -->
    <Dialog :open="showModal" @update:open="closeModal">
      <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ getModalTitle() }}</DialogTitle>
          <DialogDescription>
            {{
              isEditMode
                ? "Update the details below."
                : "Add new content to the speaking exercise."
            }}
          </DialogDescription>
        </DialogHeader>

        <!-- Part 1 Form -->
        <form
          v-if="modalType === 'part1'"
          @submit.prevent="submitForm"
          class="space-y-4"
        >
          <div class="space-y-2">
            <Label for="question">Question *</Label>
            <Textarea
              id="question"
              v-model="part1Form.question"
              placeholder="What kind of food do you like to eat?"
              rows="3"
              required
            />
          </div>

          <div class="space-y-2">
            <Label for="type">Type</Label>
            <Select v-model="part1Form.type">
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="type in part1Types"
                  :key="type.value"
                  :value="type.value"
                >
                  {{ type.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label>Image</Label>
            <div class="space-y-2">
              <div class="space-y-2">
                <Label for="image-url" class="text-sm text-muted-foreground"
                  >Image URL</Label
                >
                <Input
                  id="image-url"
                  v-model="part1Form.image_url"
                  placeholder="https://storage.example.com/images/question1.jpg"
                  type="url"
                  :disabled="!!part1Form.image_file"
                />
              </div>

              <div class="space-y-2">
                <Label for="image-file" class="text-sm text-muted-foreground"
                  >Or Upload Image File</Label
                >
                <div class="flex items-center gap-2">
                  <Input
                    :key="fileInputKey + 'img'"
                    id="image-file"
                    type="file"
                    accept="image/*"
                    @change="
                      (e) => {
                        part1Form.image_file = e.target.files[0];
                        part1Form.image_url = '';
                      }
                    "
                    :disabled="!!part1Form.image_url || isUploading"
                    class="flex-1"
                  />
                  <Button
                    v-if="part1Form.image_file"
                    type="button"
                    variant="outline"
                    size="sm"
                    @click="
                      () => {
                        part1Form.image_file = null;
                        fileInputKey += 1;
                      }
                    "
                  >
                    <X class="w-4 h-4" />
                  </Button>
                </div>
                <div
                  v-if="part1Form.image_file"
                  class="text-sm text-muted-foreground"
                >
                  Selected: {{ part1Form.image_file.name }}
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-2">
            <Label>Audio</Label>
            <div class="space-y-2">
              <div class="space-y-2">
                <Label
                  for="part1-audio-url"
                  class="text-sm text-muted-foreground"
                  >Audio URL</Label
                >
                <Input
                  id="part1-audio-url"
                  v-model="part1Form.audio_url"
                  placeholder="https://storage.example.com/audio/question1.mp3"
                  type="url"
                  :disabled="!!part1Form.audio_file"
                />
              </div>

              <div class="space-y-2">
                <Label
                  for="part1-audio-file"
                  class="text-sm text-muted-foreground"
                  >Or Upload Audio File</Label
                >
                <div class="flex items-center gap-2">
                  <Input
                    :key="fileInputKey + 'audio'"
                    id="part1-audio-file"
                    type="file"
                    accept="audio/*"
                    @change="
                      (e) => {
                        part1Form.audio_file = e.target.files[0];
                        part1Form.audio_url = '';
                      }
                    "
                    :disabled="!!part1Form.audio_url || isUploading"
                    class="flex-1"
                  />
                  <Button
                    v-if="part1Form.audio_file"
                    type="button"
                    variant="outline"
                    size="sm"
                    @click="
                      () => {
                        part1Form.audio_file = null;
                        fileInputKey += 1;
                      }
                    "
                  >
                    <X class="w-4 h-4" />
                  </Button>
                </div>
                <div
                  v-if="part1Form.audio_file"
                  class="text-sm text-muted-foreground"
                >
                  Selected: {{ part1Form.audio_file.name }}
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-2">
            <Label for="sample">Sample Answer</Label>
            <Textarea
              id="sample"
              v-model="part1Form.sample_answer"
              placeholder="I really enjoy eating various types of Asian cuisine..."
              rows="4"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" @click="closeModal"
              >Cancel</Button
            >
            <Button type="submit" :disabled="isLoading || isUploading">
              <RefreshCw v-if="isLoading" class="w-4 h-4 animate-spin mr-2" />
              {{ isEditMode ? "Update" : "Create" }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Grade Modal -->
    <Dialog :open="showGradeModal" @update:open="closeGradeModal">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Grade Response</DialogTitle>
          <DialogDescription>
            Enter pronunciation score for
            {{ selectedResponse?.student?.first_name }}
            {{ selectedResponse?.student?.last_name }}
          </DialogDescription>
        </DialogHeader>

        <form @submit.prevent="submitGrade" class="space-y-4">
          <div class="space-y-2">
            <Label for="pronunciation_score">Pronunciation Score (0-100)</Label>
            <Input
              id="pronunciation_score"
              v-model="gradeForm.pronunciation_score"
              type="number"
              min="0"
              max="100"
              step="0.1"
              placeholder="85.5"
              required
            />
            <p class="text-sm text-muted-foreground">
              Enter a score between 0 and 100
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" @click="closeGradeModal">
              Cancel
            </Button>
            <Button type="submit" :disabled="isLoading">
              <RefreshCw v-if="isLoading" class="w-4 h-4 animate-spin mr-2" />
              Save Grade
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- View Response Modal -->
    <Dialog :open="showViewModal" @update:open="closeViewModal">
      <DialogContent class="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Response Details</DialogTitle>
          <DialogDescription>
            Full transcript and results for
            {{ selectedResponse?.student?.first_name }}
            {{ selectedResponse?.student?.last_name }}
          </DialogDescription>
        </DialogHeader>

        <div v-if="selectedResponse" class="space-y-6">
          <!-- Student Info -->
          <Card>
            <CardHeader>
              <CardTitle class="text-lg">Student Information</CardTitle>
            </CardHeader>
            <CardContent class="space-y-2">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <Label class="text-sm font-medium">Name</Label>
                  <p>
                    {{ selectedResponse.student?.first_name }}
                    {{ selectedResponse.student?.last_name }}
                  </p>
                </div>
                <div>
                  <Label class="text-sm font-medium">Username</Label>
                  <p>{{ selectedResponse.student?.username }}</p>
                </div>
                <div>
                  <Label class="text-sm font-medium">Response Type</Label>
                  <Badge variant="outline" class="capitalize">
                    {{ selectedResponse.response_type || "Audio" }}
                  </Badge>
                </div>
                <div>
                  <Label class="text-sm font-medium">Submitted</Label>
                  <p>
                    {{
                      selectedResponse.createdAt
                        ? new Date(selectedResponse.createdAt).toLocaleString()
                        : "N/A"
                    }}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <!-- Transcription -->
          <Card>
            <CardHeader>
              <CardTitle class="text-lg">Full Transcription</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="bg-gray-50 p-4 rounded-lg">
                <p class="text-sm leading-relaxed">
                  {{
                    selectedResponse.transcription ||
                    "No transcription available"
                  }}
                </p>
              </div>
            </CardContent>
          </Card>

          <!-- Detailed Results -->
          <Card v-if="selectedResponse.result">
            <CardHeader>
              <CardTitle class="text-lg">Detailed Scoring Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-3">
                  <div>
                    <Label class="text-sm font-medium">Fluency</Label>
                    <div class="flex items-center gap-2">
                      <Badge
                        :variant="
                          getScoreVariant(selectedResponse.result.fluency || 0)
                        "
                      >
                        {{ selectedResponse.result.fluency || 0 }}%
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label class="text-sm font-medium">Grammar</Label>
                    <div class="flex items-center gap-2">
                      <Badge
                        :variant="
                          getScoreVariant(selectedResponse.result.grammar || 0)
                        "
                      >
                        {{ selectedResponse.result.grammar || 0 }}%
                      </Badge>
                    </div>
                  </div>
                </div>
                <div class="space-y-3">
                  <div>
                    <Label class="text-sm font-medium">Vocabulary</Label>
                    <div class="flex items-center gap-2">
                      <Badge
                        :variant="
                          getScoreVariant(
                            selectedResponse.result.vocabulary || 0
                          )
                        "
                      >
                        {{ selectedResponse.result.vocabulary || 0 }}%
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label class="text-sm font-medium">Pronunciation</Label>
                    <div class="flex items-center gap-2">
                      <Badge
                        :variant="
                          getScoreVariant(
                            selectedResponse.result.pronunciation || 0
                          )
                        "
                      >
                        {{ selectedResponse.result.pronunciation || 0 }}%
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div class="mt-4 pt-4 border-t">
                <Label class="text-sm font-medium">Overall Average</Label>
                <div class="flex items-center gap-2">
                  <Badge
                    :variant="
                      getScoreVariant(getAverageScore(selectedResponse.result))
                    "
                    class="text-lg px-3 py-1"
                  >
                    {{ getAverageScore(selectedResponse.result) }}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <!-- Teacher's Pronunciation Score -->
          <Card v-if="selectedResponse.pronunciation_score">
            <CardHeader>
              <CardTitle class="text-lg">Teacher's Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label class="text-sm font-medium">Pronunciation Score</Label>
                <div class="flex items-center gap-2">
                  <Badge
                    :variant="
                      getScoreVariant(
                        parseFloat(selectedResponse.pronunciation_score)
                      )
                    "
                    class="text-lg px-3 py-1"
                  >
                    {{
                      parseFloat(selectedResponse.pronunciation_score).toFixed(
                        1
                      )
                    }}%
                  </Badge>
                  <span class="text-sm text-muted-foreground"
                    >(Teacher graded)</span
                  >
                </div>
              </div>
            </CardContent>
          </Card>

          <!-- Audio Player (if available) -->
          <Card v-if="selectedResponse.response_file_url">
            <CardHeader>
              <CardTitle class="text-lg">Audio Response</CardTitle>
            </CardHeader>
            <CardContent>
              <audio
                controls
                class="w-full"
                :src="selectedResponse.response_file_url"
              >
                Your browser does not support the audio element.
              </audio>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button @click="closeViewModal">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
