<script setup>
import { ref, reactive, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  pronunciationAPI,
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
  FileAudio,
  ArrowLeft,
  MoreHorizontal,
  AlertCircle,
  RefreshCw,
  Upload,
  X,
  MessageSquare,
  Users,
  Eye,
} from "lucide-vue-next";

const route = useRoute();
const router = useRouter();

// Computed properties
const speakingId = computed(() => {
  console.log("Route params:", route.params);
  return route.params.speakingId;
});
const pronunciationTitle = computed(() => "Pronunciation Exercise");
const pronunciationDescription = computed(
  () => "Practice correct pronunciation"
);

const isLoading = ref(false);
const error = ref("");
const showModal = ref(false);
const isEditMode = ref(false);

// Upload states
const isUploading = ref(false);
const uploadProgress = ref(0);
const selectedFile = ref(null);
const fileInputKey = ref(0); // For resetting file input

// Data
const pronunciationExercise = ref(null);
const pronunciationItems = ref([]);
const studentResponses = ref([]);

// Grade and view modals
const showGradeModal = ref(false);
const showViewModal = ref(false);
const selectedResponse = ref(null);
const gradeForm = reactive({
  pronunciation_score: "",
});

// Form data
const pronunciationForm = reactive({
  id: null,
  speaking_id: "",
  word_to_pronunce: "",
  audio_url: "",
  audio_file: null,
});

// Functions
const fetchData = async () => {
  const currentSpeakingId = route.params.speakingId;
  console.log("Fetching data with speaking ID:", currentSpeakingId);

  if (!currentSpeakingId) {
    console.error("No speaking ID available for data fetch");
    error.value = "No speaking ID available. Please go back and try again.";
    return;
  }

  isLoading.value = true;
  error.value = "";

  try {
    // Get speaking ID directly from route params
    const currentSpeakingId = route.params.speakingId;

    // No need to fetch the speaking exercise directly since it's causing a 404 error
    // Just set a default exercise object with the ID
    pronunciationExercise.value = {
      id: currentSpeakingId,
      title: "Pronunciation Exercise",
      description: "Practice correct pronunciation",
    };

    // Fetch pronunciation items and student responses
    await Promise.all([
      fetchPronunciationItems(currentSpeakingId),
      fetchStudentResponses(),
    ]);
  } catch (err) {
    console.error("Error fetching pronunciation data:", err);
    error.value = "Failed to load pronunciation items";
  } finally {
    isLoading.value = false;
  }
};

// Student response functions
const viewResponse = (response) => {
  selectedResponse.value = response;
  showViewModal.value = true;
};

const gradeResponse = (response) => {
  selectedResponse.value = response;
  gradeForm.pronunciation_score = response.pronunciation_score || "";
  showGradeModal.value = true;
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

const getScoreVariant = (score) => {
  if (score >= 80) return "default";
  if (score >= 60) return "secondary";
  return "destructive";
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

const fetchPronunciationItems = async (id = null) => {
  try {
    // Use provided ID or get from route params
    const currentSpeakingId = id || route.params.speakingId;
    console.log(
      "Fetching pronunciation items for speaking ID:",
      currentSpeakingId
    );

    if (!currentSpeakingId) {
      console.error("No speaking ID available for fetching items");
      return;
    }

    const response = await pronunciationAPI.getBySpeakingId(currentSpeakingId);
    pronunciationItems.value = response || [];
  } catch (err) {
    console.error("Error fetching pronunciation items:", err);
    // Don't set error here, as it's a secondary fetch that shouldn't block the UI
  }
};

const fetchStudentResponses = async () => {
  try {
    const speakingId = route.params.speakingId;
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

// Modal functions
const openModal = () => {
  isEditMode.value = false;
  resetForm();

  // Explicitly ensure speaking_id is set from route
  const currentSpeakingId = route.params.speakingId;
  console.log("Opening modal with speaking_id:", currentSpeakingId);

  if (!currentSpeakingId) {
    console.error("Error: No speaking ID found in route params");
    error.value = "No speaking ID available. Please go back and try again.";
    return;
  }

  pronunciationForm.speaking_id = currentSpeakingId;
  showModal.value = true;
};

const openEditModal = (item) => {
  isEditMode.value = true;
  Object.assign(pronunciationForm, item);
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  resetForm();
};

const resetForm = () => {
  // Get the current speaking ID from route params
  const currentSpeakingId = route.params.speakingId;
  console.log("Resetting form with speaking_id:", currentSpeakingId);

  if (!currentSpeakingId) {
    console.error("Warning: No speaking ID in route params");
  }

  // Reset pronunciation form
  Object.assign(pronunciationForm, {
    id: null,
    speaking_id: currentSpeakingId,
    word_to_pronunce: "",
    audio_url: "",
    audio_file: null,
  });

  // Reset file input
  fileInputKey.value++;
};

// Form submission
const submitForm = async () => {
  error.value = "";
  isLoading.value = true;

  try {
    // Validate
    if (!pronunciationForm.word_to_pronunce.trim()) {
      error.value = "Please enter a word to pronounce";
      isLoading.value = false;
      return;
    }

    // Get speaking_id directly from route params
    const currentSpeakingId = route.params.speakingId;
    console.log(
      "Submitting form with speaking_id from route:",
      currentSpeakingId
    );

    // Ensure speaking_id is set and valid
    if (!currentSpeakingId) {
      error.value = "Speaking ID is required but not found in route params";
      isLoading.value = false;
      return;
    }

    // Update the form with current speaking_id
    pronunciationForm.speaking_id = currentSpeakingId;

    // Handle file upload if needed
    let audioUrl = pronunciationForm.audio_url;
    if (pronunciationForm.audio_file) {
      audioUrl = await uploadFile(pronunciationForm.audio_file, "audio");
    }

    // Make sure speaking_id is set in the form
    pronunciationForm.speaking_id = speakingId.value;

    const itemData = {
      speaking_id: pronunciationForm.speaking_id,
      word_to_pronunce: pronunciationForm.word_to_pronunce,
      audio_url: audioUrl,
    };

    console.log("Submitting with speaking_id:", itemData.speaking_id);

    // Validate speaking_id
    if (!itemData.speaking_id) {
      error.value = "Speaking ID is missing";
      isLoading.value = false;
      return;
    }

    if (isEditMode.value) {
      try {
        await pronunciationAPI.update(pronunciationForm.id, itemData);

        // Update item in the list
        const index = pronunciationItems.value.findIndex(
          (item) => item.id === pronunciationForm.id
        );
        if (index !== -1) {
          pronunciationItems.value[index] = {
            ...pronunciationItems.value[index],
            ...itemData,
          };
        }
      } catch (err) {
        console.error("Error updating pronunciation item:", err);
        error.value = `Failed to update pronunciation item: ${
          err.message || "Unknown error"
        }`;
        isLoading.value = false;
        return;
      }
    } else {
      try {
        const response = await pronunciationAPI.create(itemData);
        pronunciationItems.value.push(response);
      } catch (err) {
        console.error("Error creating pronunciation item:", err);
        error.value = `Failed to create pronunciation item: ${
          err.message || "Unknown error"
        }`;
        isLoading.value = false;
        return;
      }
    }

    closeModal();
  } catch (err) {
    console.error("Error submitting form:", err);
    if (err.response && err.response.data && err.response.data.message) {
      // Handle structured API error responses
      if (Array.isArray(err.response.data.message)) {
        error.value = err.response.data.message.join(", ");
      } else {
        error.value = err.response.data.message;
      }
    } else {
      error.value = `Failed to save pronunciation item: ${
        err.message || "Unknown error"
      }`;
    }
  } finally {
    isLoading.value = false;
  }
};

// Delete functionality
const confirmDelete = (id) => {
  if (confirm("Are you sure you want to delete this pronunciation item?")) {
    deleteItem(id);
  }
};

const deleteItem = async (id) => {
  isLoading.value = true;
  error.value = "";

  try {
    await pronunciationAPI.delete(id);
    pronunciationItems.value = pronunciationItems.value.filter(
      (item) => item.id !== id
    );
  } catch (err) {
    console.error("Error deleting item:", err);
    error.value = "Failed to delete pronunciation item";
  } finally {
    isLoading.value = false;
  }
};

// File upload helper
const handleFileChange = (event, field) => {
  const file = event.target.files[0];
  if (file) {
    pronunciationForm[field] = file;
    // Clear URL if file is selected
    if (field === "audio_file") {
      pronunciationForm.audio_url = "";
    }
  }
};

const removeFile = (field) => {
  pronunciationForm[field] = null;
  fileInputKey.value++;
};

const uploadFile = async (file) => {
  isUploading.value = true;
  uploadProgress.value = 0;

  try {
    const response = await uploadAPI.uploadFile(file, (progressEvent) => {
      uploadProgress.value = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
    });

    return response.url;
  } catch (err) {
    console.error("File upload error:", err);
    error.value = "Failed to upload file";
    throw err;
  } finally {
    isUploading.value = false;
  }
};

// Watch for route param changes
watch(speakingId, (newId) => {
  console.log("Route param changed to:", newId);
  if (newId) {
    pronunciationForm.speaking_id = newId;
    fetchData();
  }
});

// Lifecycle hooks
onMounted(() => {
  // Get the current speaking ID from route params
  const currentSpeakingId = route.params.speakingId;
  console.log("Component mounted. Speaking ID from route:", currentSpeakingId);

  if (currentSpeakingId) {
    // Directly set speaking_id from route params
    pronunciationForm.speaking_id = currentSpeakingId;
  } else {
    console.error("No speaking ID found in route params on mount");
    error.value = "No speaking ID available. Please go back and try again.";
  }

  fetchData();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header with Back Button -->
    <div
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div class="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          class="flex items-center gap-1"
          @click="router.back()"
        >
          <ArrowLeft class="h-4 w-4" />
          Back
        </Button>
        <div class="space-y-1">
          <h1 class="text-3xl font-bold tracking-tight">
            {{ pronunciationTitle }}
          </h1>
          <p class="text-muted-foreground">{{ pronunciationDescription }}</p>
        </div>
      </div>
    </div>

    <!-- Error Alert -->
    <Alert v-if="error" variant="destructive">
      <AlertCircle class="h-4 w-4" />
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <!-- Content Tabs -->
    <Tabs default-value="items" class="w-full">
      <TabsList class="grid w-full grid-cols-2">
        <TabsTrigger value="items" class="flex items-center gap-2">
          <MessageSquare class="w-4 h-4" />
          Pronunciation Items
        </TabsTrigger>
        <TabsTrigger value="responses" class="flex items-center gap-2">
          <Users class="w-4 h-4" />
          Student Responses
        </TabsTrigger>
      </TabsList>

      <!-- Pronunciation Items Tab -->
      <TabsContent value="items">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center justify-between">
              <span>Pronunciation Items</span>
              <Button @click="openModal" class="flex items-center gap-2">
                <Plus class="w-4 h-4" />
                Add Pronunciation Item
              </Button>
            </CardTitle>
            <CardDescription
              >Words and phrases students need to pronounce
              correctly</CardDescription
            >
          </CardHeader>
          <CardContent>
            <div v-if="isLoading" class="space-y-3">
              <Skeleton v-for="i in 3" :key="i" class="h-16 w-full" />
            </div>

            <div
              v-else-if="pronunciationItems.length === 0"
              class="text-center py-8"
            >
              <Volume2 class="mx-auto w-12 h-12 text-gray-400 mb-4" />
              <p class="text-lg font-medium text-gray-900">
                No pronunciation items
              </p>
              <p class="text-gray-600">Add your first pronunciation item.</p>
            </div>

            <Table v-else>
              <TableHeader>
                <TableRow>
                  <TableHead>Word to Pronounce</TableHead>
                  <TableHead>Audio</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead class="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="item in pronunciationItems" :key="item.id">
                  <TableCell class="font-medium max-w-md">
                    {{ item.word_to_pronunce }}
                  </TableCell>
                  <TableCell>
                    <div v-if="item.audio_url">
                      <Badge
                        variant="secondary"
                        class="flex items-center gap-1 w-fit"
                      >
                        <FileAudio class="w-3 h-3" />
                        Audio Available
                      </Badge>
                    </div>
                    <span v-else class="text-muted-foreground">No audio</span>
                  </TableCell>
                  <TableCell>
                    <div class="text-sm">
                      {{
                        item.createdAt
                          ? new Date(item.createdAt).toLocaleDateString()
                          : "N/A"
                      }}
                    </div>
                  </TableCell>
                  <TableCell class="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" class="h-8 w-8 p-0">
                          <MoreHorizontal class="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem @click="openEditModal(item)">
                          <Edit class="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          @click="confirmDelete(item.id)"
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
                  <TableHead>Submitted At</TableHead>
                  <TableHead>Pronunciation Score</TableHead>
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
                    <div class="text-sm">
                      {{
                        response.createdAt
                          ? new Date(response.createdAt).toLocaleDateString()
                          : "N/A"
                      }}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div
                      v-if="response.pronunciation_score"
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
                          <Eye class="w-4 h-4 mr-2" />
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

    <!-- Add/Edit Pronunciation Item Modal -->
    <Dialog v-model:open="showModal">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>{{
            isEditMode ? "Edit Pronunciation Item" : "Add Pronunciation Item"
          }}</DialogTitle>
          <DialogDescription>
            {{
              isEditMode
                ? "Update this pronunciation item."
                : "Add a new pronunciation item for students to practice."
            }}
          </DialogDescription>
        </DialogHeader>

        <form @submit.prevent="submitForm" class="space-y-4">
          <div class="space-y-2">
            <Label for="word">Word to Pronounce *</Label>
            <Input
              id="word"
              v-model="pronunciationForm.word_to_pronunce"
              placeholder="Enter word to pronounce"
              required
            />
          </div>

          <div class="space-y-2">
            <Label>Audio</Label>
            <div class="space-y-2">
              <!-- Audio URL Option -->
              <div class="space-y-2">
                <Label for="audio-url" class="text-sm text-muted-foreground"
                  >Audio URL</Label
                >
                <Input
                  id="audio-url"
                  v-model="pronunciationForm.audio_url"
                  placeholder="https://storage.example.com/audio/pronunciation.mp3"
                  type="url"
                  :disabled="!!pronunciationForm.audio_file"
                />
              </div>

              <!-- File Upload Option -->
              <div class="space-y-2">
                <Label for="audio-file" class="text-sm text-muted-foreground"
                  >Or Upload Audio File</Label
                >
                <div class="flex items-center gap-2">
                  <Input
                    :key="fileInputKey"
                    id="audio-file"
                    type="file"
                    accept="audio/*"
                    class="flex-1"
                    @change="(e) => handleFileChange(e, 'audio_file')"
                    :disabled="isUploading"
                  />
                  <Button
                    v-if="pronunciationForm.audio_file"
                    type="button"
                    variant="outline"
                    size="sm"
                    @click="removeFile('audio_file')"
                  >
                    <X class="w-4 h-4" />
                  </Button>
                </div>

                <!-- Upload Progress -->
                <div v-if="isUploading" class="mt-2">
                  <div class="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      class="h-full bg-blue-500 transition-all"
                      :style="{ width: `${uploadProgress}%` }"
                    ></div>
                  </div>
                  <div class="text-xs text-right mt-1">
                    {{ uploadProgress }}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" @click="closeModal"
              >Cancel</Button
            >
            <Button type="submit" :disabled="isLoading || isUploading">
              <RefreshCw v-if="isLoading" class="w-4 h-4 mr-2 animate-spin" />
              {{ isEditMode ? "Update Item" : "Add Item" }}
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
      <DialogContent class="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Response Details</DialogTitle>
          <DialogDescription>
            Response details for {{ selectedResponse?.student?.first_name }}
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
                  <Label class="text-sm font-medium">Phone</Label>
                  <p>{{ selectedResponse.student?.phone || "N/A" }}</p>
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

          <!-- Response Details -->
          <Card>
            <CardHeader>
              <CardTitle class="text-lg">Response Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="space-y-2">
                <div>
                  <Label class="text-sm font-medium">Response Type</Label>
                  <Badge variant="outline" class="capitalize">
                    {{ selectedResponse.response_type || "Audio" }}
                  </Badge>
                </div>
                <div v-if="selectedResponse.speaking_id">
                  <Label class="text-sm font-medium"
                    >Speaking Exercise ID</Label
                  >
                  <p class="text-sm font-mono">
                    {{ selectedResponse.speaking_id }}
                  </p>
                </div>
              </div>
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
