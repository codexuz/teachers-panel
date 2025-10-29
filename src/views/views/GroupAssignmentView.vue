<template>
  <div class="container p-4 sm:p-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex flex-col md:flex-row md:justify-between md:items-center">
        <div class="space-y-1">
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">
            Group Assignment
          </h1>
          <p class="text-muted-foreground">
            Assign and manage learning units for your groups
          </p>
        </div>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="error" class="mb-6">
      <Alert variant="destructive" class="flex items-start">
        <AlertCircle class="h-4 w-4 mr-2 mt-0.5" />
        <div class="flex-1">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{{ error }}</AlertDescription>
        </div>
        <Button variant="ghost" size="icon" class="h-8 w-8" @click="error = ''">
          <X class="h-4 w-4" />
        </Button>
      </Alert>
    </div>

    <!-- Success Message -->
    <div v-if="successMessage" class="mb-6">
      <Alert
        class="flex items-start bg-green-50 border-green-200 text-green-800"
      >
        <Check class="h-4 w-4 mr-2 mt-0.5 text-green-600" />
        <div class="flex-1">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{{ successMessage }}</AlertDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8 text-green-700 hover:text-green-900"
          @click="successMessage = ''"
        >
          <X class="h-4 w-4" />
        </Button>
      </Alert>
    </div>

    <!-- Progress Indicator -->
    <!-- Progress Indicator -->
    <div class="mb-8">
      <div class="flex flex-wrap gap-2 sm:gap-0">
        <div class="flex items-center flex-1">
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm"
            :class="[
              selectedGroup ? 'bg-primary' : 'bg-primary/90',
              selectedUnits.length > 0 ? 'bg-primary/80' : '',
            ]"
          >
            1
          </div>
          <div
            class="h-1 flex-1"
            :class="[selectedGroup ? 'bg-primary' : 'bg-muted']"
          ></div>
        </div>
        <div class="flex items-center flex-1">
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm"
            :class="[
              selectedGroup && selectedUnits.length > 0
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground',
            ]"
          >
            2
          </div>
          <div
            class="h-1 flex-1"
            :class="[
              selectedGroup && selectedUnits.length > 0
                ? 'bg-primary'
                : 'bg-muted',
            ]"
          ></div>
        </div>
        <div class="flex items-center flex-1">
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm"
            :class="[
              selectedGroup &&
              selectedUnits.length > 0 &&
              (dueDate || assignmentType)
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground',
            ]"
          >
            3
          </div>
        </div>
      </div>
      <div class="flex flex-wrap gap-2 sm:gap-0 mt-2 text-sm">
        <div
          class="flex-1 text-center sm:text-left font-medium"
          :class="selectedGroup ? 'text-primary' : 'text-muted-foreground'"
        >
          Select Group
        </div>
        <div
          class="flex-1 text-center font-medium"
          :class="
            selectedGroup && selectedUnits.length > 0
              ? 'text-primary'
              : 'text-muted-foreground'
          "
        >
          Select Units
        </div>
        <div
          class="flex-1 text-center sm:text-right font-medium"
          :class="
            selectedGroup &&
            selectedUnits.length > 0 &&
            (dueDate || assignmentType)
              ? 'text-primary'
              : 'text-muted-foreground'
          "
        >
          Assignment Details
        </div>
      </div>
    </div>
    <!-- Group Selection -->
    <Card class="mb-8">
      <CardHeader>
        <CardTitle class="flex items-center">
          <Users class="h-5 w-5 mr-2 text-primary" />
          Step 1: Select a Group
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Group Selection -->
          <div class="space-y-2">
            <Label>Select Group</Label>
            <Select
              v-model="selectedGroupId"
              @update:model-value="handleGroupSelection"
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a group to assign units" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="null">Select a group</SelectItem>
                <SelectItem
                  v-for="group in filteredGroups"
                  :key="group.id"
                  :value="group.id"
                >
                  {{ group.name }} - {{ getCourseTitle(group.level_id) }} ({{
                    group.student_count || 0
                  }}
                  students)
                </SelectItem>
              </SelectContent>
            </Select>
            <p v-if="isLoading" class="text-sm text-muted-foreground">
              Loading groups...
            </p>
            <p
              v-else-if="groups.length === 0"
              class="text-sm text-muted-foreground"
            >
              No groups available
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Unit Selection -->
    <Card v-if="selectedGroup" class="mb-8">
      <CardHeader>
        <CardTitle class="flex items-center">
          <BookOpen class="h-5 w-5 mr-2 text-primary" />
          Step 2: Manage Units Assignment
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div
          v-if="isLoadingUnits || isLoadingAssignedUnits"
          class="text-center py-8"
        >
          <Loader2 class="h-10 w-10 mx-auto text-primary mb-4 animate-spin" />
          <p class="text-muted-foreground">Loading units...</p>
        </div>

        <div v-else>
          <!-- Filter units by search -->
          <div class="mb-6">
            <Label for="unitSearch">Search Units</Label>
            <div class="relative mt-1.5">
              <Search
                class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              />
              <Input
                id="unitSearch"
                v-model="unitSearchQuery"
                placeholder="Search by unit title..."
                class="pl-9"
              />
            </div>
          </div>

          <!-- Tabs for Already Assigned and Available -->
          <Tabs defaultValue="assigned" class="mt-6">
            <TabsList class="grid w-full grid-cols-2">
              <TabsTrigger value="assigned" class="flex items-center">
                <CheckCircle2 class="h-4 w-4 mr-2" />
                <span
                  >Assigned Units
                  <Badge v-if="assignedFilteredUnits.length">{{
                    assignedFilteredUnits.length
                  }}</Badge></span
                >
              </TabsTrigger>
              <TabsTrigger value="available" class="flex items-center">
                <Plus class="h-4 w-4 mr-2" />
                <span
                  >Available Units
                  <Badge v-if="availableUnits.length">{{
                    availableUnits.length
                  }}</Badge></span
                >
              </TabsTrigger>
            </TabsList>

            <!-- Already Assigned Units Tab -->
            <TabsContent value="assigned">
              <div
                v-if="assignedFilteredUnits.length === 0"
                class="text-center py-10 bg-muted/50 rounded-lg border mt-4"
              >
                <ClipboardCheck
                  class="h-12 w-12 mx-auto text-muted-foreground/70 mb-4"
                />
                <p class="text-muted-foreground font-medium">
                  No units assigned
                </p>
                <p class="text-muted-foreground/70 text-sm mt-1">
                  Switch to Available Units tab to assign some
                </p>
              </div>

              <div v-else class="space-y-3 mt-4">
                <Card
                  v-for="unit in assignedFilteredUnits"
                  :key="unit.id"
                  class="border-blue-200 bg-blue-50/50"
                >
                  <CardContent class="p-4">
                    <!-- Unit Header -->
                    <div class="flex items-center justify-between">
                      <div class="flex-1">
                        <div class="flex items-center gap-2">
                          <h3 class="font-medium">
                            {{ unit.unit?.title || unit.title }}
                          </h3>
                          <Button
                            v-if="unit.lessons && unit.lessons.length > 0"
                            variant="ghost"
                            size="sm"
                            @click="toggleUnitExpansion(unit.id)"
                            class="p-1 h-6 w-6"
                          >
                            <ChevronDown
                              v-if="!isUnitExpanded(unit.id)"
                              class="h-4 w-4"
                            />
                            <ChevronUp v-else class="h-4 w-4" />
                          </Button>
                          <Badge variant="outline" class="text-xs">
                            {{ unit.lessons ? unit.lessons.length : 0 }} lessons
                          </Badge>
                        </div>
                        <p class="text-sm text-muted-foreground mt-1">
                          {{
                            unit.unit?.description ||
                            unit.description ||
                            "No description available"
                          }}
                        </p>
                        <div
                          class="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground"
                        >
                          <div>
                            <span class="font-medium">Created:</span>
                            {{ formatDate(unit.createdAt) }}
                          </div>
                          <div>
                            <span class="font-medium">Status:</span>
                            <Badge
                              variant="outline"
                              :class="getLessonStatusVariant(unit.status)"
                            >
                              {{
                                unit.status === "unlocked"
                                  ? "Unlocked"
                                  : "Locked"
                              }}
                            </Badge>
                          </div>
                          <div>
                            <span class="font-medium">Teacher:</span>
                            Teacher
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        @click="unassignUnit(unit)"
                        class="h-8 w-8"
                        title="Unassign Unit"
                      >
                        <Trash2 class="h-4 w-4" />
                      </Button>
                    </div>

                    <!-- Lessons List (Expandable) -->
                    <div
                      v-if="
                        unit.lessons &&
                        unit.lessons.length > 0 &&
                        isUnitExpanded(unit.id)
                      "
                      class="mt-4 border-t pt-4"
                    >
                      <h4 class="text-sm font-medium mb-3 text-gray-700">
                        Lessons in this Unit:
                      </h4>
                      <div class="space-y-2">
                        <div
                          v-for="lesson in unit.lessons"
                          :key="lesson.id"
                          class="bg-white p-3 rounded-lg border border-gray-200"
                        >
                          <!-- Lesson Header -->
                          <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center gap-2">
                              <h5 class="font-medium text-sm">
                                {{ lesson.lesson?.title || "Lesson" }}
                              </h5>
                              <Badge variant="outline" class="text-xs">
                                Order {{ lesson.lesson?.order || "N/A" }}
                              </Badge>
                            </div>
                            <Button
                              v-if="editingLesson !== lesson.id"
                              variant="outline"
                              size="sm"
                              @click="startEditingLesson(lesson)"
                              class="h-7 px-2 text-xs"
                            >
                              <Edit class="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          </div>

                          <!-- Lesson Details (View Mode) -->
                          <div
                            v-if="editingLesson !== lesson.id"
                            class="grid grid-cols-3 gap-3 text-xs text-gray-600"
                          >
                            <div>
                              <span class="font-medium">Start:</span>
                              {{
                                lesson.start_from
                                  ? formatDate(lesson.start_from)
                                  : "Not set"
                              }}
                            </div>
                            <div>
                              <span class="font-medium">End:</span>
                              {{
                                lesson.end_at
                                  ? formatDate(lesson.end_at)
                                  : "No end date"
                              }}
                            </div>
                            <div>
                              <span class="font-medium">Status:</span>
                              <Badge
                                variant="outline"
                                :class="getLessonStatusVariant(lesson.status)"
                                class="ml-1"
                              >
                                {{
                                  lesson.status === "unlocked"
                                    ? "Unlocked"
                                    : "Locked"
                                }}
                              </Badge>
                            </div>
                          </div>

                          <!-- Lesson Details (Edit Mode) -->
                          <div v-else class="space-y-3">
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <!-- Start From -->
                              <div>
                                <Label class="text-xs">Start From</Label>
                                <Input
                                  v-model="lessonEditForm.start_from"
                                  type="date"
                                  class="h-8 text-xs"
                                />
                              </div>
                              <!-- End At -->
                              <div>
                                <Label class="text-xs">End At</Label>
                                <Input
                                  v-model="lessonEditForm.end_at"
                                  type="date"
                                  class="h-8 text-xs"
                                />
                              </div>
                              <!-- Status -->
                              <div>
                                <Label class="text-xs">Status</Label>
                                <Select v-model="lessonEditForm.status">
                                  <SelectTrigger class="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="locked"
                                      >Locked</SelectItem
                                    >
                                    <SelectItem value="unlocked"
                                      >Unlocked</SelectItem
                                    >
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <!-- Edit Actions -->
                            <div class="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                @click="cancelEditingLesson"
                                class="h-7 px-2 text-xs"
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                @click="updateLesson(lesson)"
                                :disabled="isSubmitting"
                                class="h-7 px-2 text-xs"
                              >
                                <Save class="h-3 w-3 mr-1" />
                                Save
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- No Lessons Message -->
                    <div
                      v-else-if="isUnitExpanded(unit.id)"
                      class="mt-4 border-t pt-4 text-center text-sm text-muted-foreground"
                    >
                      No lessons assigned to this unit yet.
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <!-- Available Units Tab -->
            <TabsContent value="available">
              <div class="flex justify-between items-center mb-4 mt-2">
                <h3 class="text-sm font-medium text-muted-foreground">
                  Units Available to Assign
                </h3>

                <div class="flex gap-2">
                  <Button
                    v-if="availableUnits.length > 0"
                    @click="selectAllAvailableUnits"
                    variant="outline"
                    size="sm"
                    class="h-8"
                  >
                    <CheckCheck class="h-3.5 w-3.5 mr-1.5" /> Select All
                  </Button>
                  <Button
                    v-if="selectedUnits.length > 0"
                    @click="deselectAllUnits"
                    variant="ghost"
                    size="sm"
                    class="h-8"
                  >
                    <X class="h-3.5 w-3.5 mr-1.5" /> Clear
                  </Button>
                </div>
              </div>

              <div
                v-if="availableUnits.length === 0"
                class="text-center py-10 bg-muted/50 rounded-lg border"
              >
                <CheckCheck
                  class="h-12 w-12 mx-auto text-muted-foreground/70 mb-4"
                />
                <p class="text-muted-foreground font-medium">
                  All units have been assigned to this group
                </p>
              </div>

              <div v-else class="space-y-3">
                <Card
                  v-for="unit in availableUnits"
                  :key="unit.id"
                  @click="toggleUnitSelection(unit)"
                  class="cursor-pointer hover:shadow-sm transition-all duration-200"
                  :class="{
                    'border-green-500 bg-green-50/50': isUnitSelected(unit.id),
                  }"
                >
                  <CardContent class="p-4">
                    <div class="flex items-center justify-between">
                      <div class="flex items-start">
                        <Checkbox
                          :checked="isUnitSelected(unit.id)"
                          @click.stop
                          @update:checked="toggleUnitSelection(unit)"
                          class="mr-3 mt-0.5"
                        />
                        <div>
                          <h3 class="font-medium">{{ unit.title }}</h3>
                          <p class="text-sm text-muted-foreground mt-1">
                            {{ unit.description || "No description available" }}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline"
                        >Order: {{ unit.order || "N/A" }}</Badge
                      >
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>

    <!-- Assignment Configuration -->
    <Card
      id="configSection"
      v-if="selectedGroup && selectedUnits.length > 0"
      class="mb-8"
    >
      <CardHeader>
        <CardTitle class="flex items-center">
          <Settings class="h-5 w-5 mr-2 text-primary" />
          Step 3: Configure Assignment
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <!-- Left Column -->
          <div class="space-y-6">
            <!-- Start Date -->
            <div>
              <Label for="startDate" class="mb-1.5">Start Date</Label>
              <div class="relative">
                <Calendar
                  class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                />
                <Input
                  id="startDate"
                  type="date"
                  v-model="assignmentForm.start_date"
                  class="pl-9"
                />
              </div>
              <p class="text-sm text-muted-foreground mt-2 flex items-center">
                <Info class="h-3.5 w-3.5 mr-1 text-primary" />
                When students can start accessing these units
              </p>
            </div>

            <!-- End Date -->
            <div>
              <Label for="endDate" class="mb-1.5">End Date</Label>
              <div class="relative">
                <Calendar
                  class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                />
                <Input
                  id="endDate"
                  type="date"
                  v-model="assignmentForm.end_date"
                  class="pl-9"
                />
              </div>
              <p class="text-sm text-muted-foreground mt-2 flex items-center">
                <Info class="h-3.5 w-3.5 mr-1 text-primary" />
                When access will expire (leave empty for no expiration)
              </p>
            </div>
          </div>

          <!-- Right Column -->
          <div class="space-y-6">
            <!-- Status with Radio Buttons -->
            <div>
              <Label class="mb-3">Assignment Status</Label>

              <RadioGroup v-model="assignmentForm.status">
                <div class="space-y-3">
                  <Card
                    :class="
                      assignmentForm.status === 'locked'
                        ? 'border-orange-300 bg-orange-50/50'
                        : ''
                    "
                    class="cursor-pointer"
                  >
                    <CardContent class="p-3 flex items-center space-x-3">
                      <RadioGroupItem value="locked" id="status-locked" />
                      <div>
                        <Label
                          for="status-locked"
                          class="flex items-center cursor-pointer"
                        >
                          <Lock class="h-4 w-4 mr-2 text-orange-500" />
                          Locked
                        </Label>
                        <p class="text-sm text-muted-foreground mt-1">
                          Content will be assigned but not accessible to
                          students yet
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card
                    :class="
                      assignmentForm.status === 'unlocked'
                        ? 'border-green-300 bg-green-50/50'
                        : ''
                    "
                    class="cursor-pointer"
                  >
                    <CardContent class="p-3 flex items-center space-x-3">
                      <RadioGroupItem value="unlocked" id="status-unlocked" />
                      <div>
                        <Label
                          for="status-unlocked"
                          class="flex items-center cursor-pointer"
                        >
                          <Unlock class="h-4 w-4 mr-2 text-green-500" />
                          Unlocked
                        </Label>
                        <p class="text-sm text-muted-foreground mt-1">
                          Students can access the content immediately
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </RadioGroup>
            </div>

            <!-- Assignment Summary -->
            <Card class="border-primary/30 bg-primary/5">
              <CardContent class="p-4">
                <h4 class="font-medium text-primary mb-3 flex items-center">
                  <Info class="h-4 w-4 mr-2" />
                  Assignment Summary
                </h4>
                <ul class="space-y-2 text-sm">
                  <li class="flex items-center">
                    <Check class="h-3.5 w-3.5 mr-2 text-green-600" />
                    Assigning
                    <span class="font-medium mx-1">{{
                      selectedUnits.length
                    }}</span>
                    units
                  </li>
                  <li class="flex items-center">
                    <Check class="h-3.5 w-3.5 mr-2 text-green-600" />
                    To group
                    <span class="font-medium mx-1">{{
                      selectedGroup.name
                    }}</span>
                  </li>
                  <li class="flex items-center">
                    <Check class="h-3.5 w-3.5 mr-2 text-green-600" />
                    All lessons within selected units will be included
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Submit Button -->
    <div v-if="selectedGroup && selectedUnits.length > 0" class="text-center">
      <Card class="inline-block bg-muted/50 border-border">
        <CardContent class="p-6 flex flex-col items-center">
          <Button
            @click="submitAssignments"
            :disabled="isSubmitting"
            variant="default"
            size="lg"
            class="min-w-[220px] text-base font-medium"
          >
            <div v-if="isSubmitting" class="flex items-center">
              <Loader2 class="h-4 w-4 mr-2 animate-spin" />
              Assigning...
            </div>
            <div v-else class="flex items-center">
              <Check class="h-4 w-4 mr-2" />
              Assign Units & Lessons
            </div>
          </Button>
          <p class="text-sm text-muted-foreground mt-3 max-w-md">
            <Info class="h-3.5 w-3.5 inline-block mr-1 text-primary" />
            This will assign all lessons in the selected units to the group
          </p>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import {
  groupsAPI,
  courseAPI,
  unitsAPI,
  groupAssignedUnitsAPI,
  groupAssignedLessonsAPI,
} from "@/utils/api.js";
import { useAuthStore } from "@/stores/auth.js";

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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Lucide Icons
import {
  Users,
  BookOpen,
  Calendar,
  Check,
  Search,
  X,
  Trash2,
  CheckCheck,
  Info,
  AlertCircle,
  Settings,
  Lock,
  Unlock,
  Loader2,
  ClipboardCheck,
  Plus,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit,
  Save,
} from "lucide-vue-next";

const authStore = useAuthStore();

// State
const isLoading = ref(false);
const isLoadingUnits = ref(false);
const isLoadingAssignedUnits = ref(false);
const isSubmitting = ref(false);
const error = ref("");
const successMessage = ref("");
const groups = ref([]);
const courses = ref([]);
const units = ref([]);
const assignedUnits = ref([]);
const selectedGroup = ref(null);
const selectedGroupId = ref("");
const selectedUnits = ref([]);
const searchQuery = ref("");
const unitSearchQuery = ref("");

// Lesson management state
const expandedUnits = ref(new Set());
const editingLesson = ref(null);
const lessonEditForm = ref({
  start_from: "",
  end_at: "",
  status: "",
});

// Form for assignment configuration
const assignmentForm = ref({
  start_date: new Date().toISOString().split("T")[0], // Today
  end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0], // +30 days
  status: "locked", // Default status
});

// Computed
const filteredGroups = computed(() => {
  if (!searchQuery.value) {
    return groups.value;
  }

  const query = searchQuery.value.toLowerCase();
  return groups.value.filter((group) =>
    group.name.toLowerCase().includes(query)
  );
});

const isUnitAlreadyAssigned = (unitId) => {
  console.log(`Checking if unit ${unitId} is already assigned`);
  console.log("assignedUnits.value:", assignedUnits.value);

  const isAssigned = assignedUnits.value.some((assigned) => {
    console.log(
      `Comparing assigned.unit_id: ${assigned.unit_id} with unitId: ${unitId}`
    );
    return assigned.unit_id === unitId;
  });

  console.log(`Unit ${unitId} isAssigned: ${isAssigned}`);
  return isAssigned;
};

const filteredUnits = computed(() => {
  console.log("=== DEBUG: filteredUnits computed ===");
  console.log("selectedGroup.value:", selectedGroup.value);
  console.log("units.value:", units.value);

  if (!selectedGroup.value) {
    console.log("No selected group, returning empty array");
    return [];
  }

  console.log("selectedGroup.level_id:", selectedGroup.value.level_id);

  let result = units.value.filter((unit) => {
    console.log(
      `Unit ${unit.title}: unit.courseId=${unit.courseId}, selectedGroup.level_id=${selectedGroup.value.level_id}`
    );
    return unit.courseId === selectedGroup.value.level_id;
  });

  console.log("Units after courseId filter:", result);

  if (unitSearchQuery.value) {
    const query = unitSearchQuery.value.toLowerCase();
    result = result.filter(
      (unit) =>
        unit.title.toLowerCase().includes(query) ||
        (unit.description && unit.description.toLowerCase().includes(query))
    );
    console.log("Units after search filter:", result);
  }

  console.log("Final filtered units:", result);
  return result;
});

const availableUnits = computed(() => {
  console.log("=== DEBUG: availableUnits computed ===");
  console.log("filteredUnits.value:", filteredUnits.value);
  console.log("assignedUnits.value:", assignedUnits.value);
  console.log("selectedGroup.value:", selectedGroup.value);

  const available = filteredUnits.value.filter((unit) => {
    const isAssigned = isUnitAlreadyAssigned(unit.id);
    console.log(`Unit ${unit.title} (${unit.id}) - isAssigned: ${isAssigned}`);
    return !isAssigned;
  });

  console.log("Final available units:", available);
  return available;
});

const assignedFilteredUnits = computed(() => {
  if (!selectedGroup.value || assignedUnits.value.length === 0) return [];

  // Get full unit details for assigned units
  const result = assignedUnits.value.map((assigned) => {
    const fullUnitDetails =
      units.value.find((unit) => unit.id === assigned.unit_id) || {};
    return {
      ...assigned,
      title: fullUnitDetails.title || "Unknown Unit",
      description: fullUnitDetails.description || "",
      order: fullUnitDetails.order,
    };
  });

  if (unitSearchQuery.value) {
    const query = unitSearchQuery.value.toLowerCase();
    return result.filter(
      (unit) =>
        unit.title.toLowerCase().includes(query) ||
        (unit.description && unit.description.toLowerCase().includes(query))
    );
  }

  return result;
});

// Methods
const fetchGroups = async () => {
  isLoading.value = true;
  error.value = "";

  try {
    const response = await groupsAPI.getByTeacherId(authStore.userId);
    const groupsData = response.data || response;
    groups.value = Array.isArray(groupsData) ? groupsData : [];
  } catch (err) {
    error.value = `Failed to fetch groups: ${err.message || "Unknown error"}`;
    console.error("Error fetching groups:", err);
    groups.value = [];
  } finally {
    isLoading.value = false;
  }
};

const fetchCourses = async () => {
  try {
    const response = await courseAPI.getAll();
    const coursesData = response.data || response;
    courses.value = Array.isArray(coursesData) ? coursesData : [];
  } catch (err) {
    console.error("Error fetching courses:", err);
    courses.value = [];
  }
};

const fetchUnits = async () => {
  if (!selectedGroup.value || !selectedGroup.value.level_id) {
    console.log("Cannot fetch units - no selected group or level_id");
    return;
  }

  console.log("=== DEBUG: fetchUnits ===");
  console.log("selectedGroup.value.level_id:", selectedGroup.value.level_id);

  isLoadingUnits.value = true;
  try {
    const response = await unitsAPI.getByCourseId(selectedGroup.value.level_id);
    console.log("Units API response:", response);
    const unitsData = response.data || response;
    console.log("Units data:", unitsData);
    units.value = Array.isArray(unitsData) ? unitsData : [];
    console.log("Final units.value:", units.value);
  } catch (err) {
    console.error("Error fetching units:", err);
    units.value = [];
  } finally {
    isLoadingUnits.value = false;
  }
};

const fetchAssignedUnits = async () => {
  if (!selectedGroup.value || !selectedGroup.value.id) {
    console.log("Cannot fetch assigned units - no selected group or group id");
    return;
  }

  console.log("=== DEBUG: fetchAssignedUnits ===");
  console.log("selectedGroup.value.id:", selectedGroup.value.id);

  isLoadingAssignedUnits.value = true;
  try {
    const response = await groupAssignedUnitsAPI.getByGroupId(
      selectedGroup.value.id
    );
    console.log("Assigned units API response:", response);
    const assignedUnitsData = response.data || response;
    console.log("Assigned units data:", assignedUnitsData);
    assignedUnits.value = Array.isArray(assignedUnitsData)
      ? assignedUnitsData
      : [];
    console.log("Final assignedUnits.value:", assignedUnits.value);
  } catch (err) {
    console.error("Error fetching assigned units:", err);
    assignedUnits.value = [];
  } finally {
    isLoadingAssignedUnits.value = false;
  }
};

const selectGroup = (group) => {
  selectedGroup.value = group;
  selectedGroupId.value = group.id;
  selectedUnits.value = [];
  assignedUnits.value = [];
  fetchUnits();
  fetchAssignedUnits();
};

const handleGroupSelection = async (groupId) => {
  if (groupId) {
    const group = groups.value.find((g) => g.id === groupId);
    if (group) {
      selectGroup(group);
    }
  } else {
    selectedGroup.value = null;
    selectedGroupId.value = "";
    selectedUnits.value = [];
    assignedUnits.value = [];
    units.value = [];
  }
};

const toggleUnitSelection = (unit) => {
  const index = selectedUnits.value.findIndex((u) => u.id === unit.id);
  if (index === -1) {
    selectedUnits.value.push(unit);
  } else {
    selectedUnits.value.splice(index, 1);
  }
};

const isUnitSelected = (unitId) => {
  return selectedUnits.value.some((unit) => unit.id === unitId);
};

const selectAllAvailableUnits = () => {
  // Add all available units that aren't already selected
  availableUnits.value.forEach((unit) => {
    if (!isUnitSelected(unit.id)) {
      selectedUnits.value.push(unit);
    }
  });
  successMessage.value = `Selected all ${availableUnits.value.length} available units`;
};

const deselectAllUnits = () => {
  selectedUnits.value = [];
  successMessage.value = "Cleared all selections";
};

const unassignUnit = async (assignedUnit) => {
  if (!selectedGroup.value) return;

  error.value = "";
  successMessage.value = "";

  try {
    // Use the delete method from groupAssignedUnitsAPI
    await groupAssignedUnitsAPI.delete(assignedUnit.id);

    // Remove from local state
    assignedUnits.value = assignedUnits.value.filter(
      (unit) => unit.id !== assignedUnit.id
    );

    successMessage.value = `"${assignedUnit.title}" has been unassigned from this group`;
  } catch (err) {
    error.value = `Failed to unassign unit: ${err.message || "Unknown error"}`;
    console.error("Error unassigning unit:", err);
  }
};

const getCourseTitle = (courseId) => {
  const course = courses.value.find((c) => c.id === courseId);
  return course ? course.title : "Unknown Course";
};

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return "Invalid Date";
  }
};

// Lesson management methods
const toggleUnitExpansion = (unitId) => {
  if (expandedUnits.value.has(unitId)) {
    expandedUnits.value.delete(unitId);
  } else {
    expandedUnits.value.add(unitId);
  }
};

const isUnitExpanded = (unitId) => {
  return expandedUnits.value.has(unitId);
};

const startEditingLesson = (lesson) => {
  editingLesson.value = lesson.id;
  lessonEditForm.value = {
    start_from: lesson.start_from || "",
    end_at: lesson.end_at || "",
    status: lesson.status || "locked",
  };
};

const cancelEditingLesson = () => {
  editingLesson.value = null;
  lessonEditForm.value = {
    start_from: "",
    end_at: "",
    status: "",
  };
};

const updateLesson = async (lesson) => {
  try {
    isSubmitting.value = true;
    error.value = "";

    const updateData = {
      start_from: lessonEditForm.value.start_from,
      end_at: lessonEditForm.value.end_at,
      status: lessonEditForm.value.status,
    };

    await groupAssignedLessonsAPI.update(lesson.id, updateData);

    // Update the lesson in local state
    const unitIndex = assignedUnits.value.findIndex(
      (unit) => unit.lessons && unit.lessons.some((l) => l.id === lesson.id)
    );

    if (unitIndex !== -1) {
      const lessonIndex = assignedUnits.value[unitIndex].lessons.findIndex(
        (l) => l.id === lesson.id
      );
      if (lessonIndex !== -1) {
        Object.assign(
          assignedUnits.value[unitIndex].lessons[lessonIndex],
          updateData
        );
      }
    }

    successMessage.value = "Lesson updated successfully";
    cancelEditingLesson();
  } catch (err) {
    error.value = `Failed to update lesson: ${err.message || "Unknown error"}`;
    console.error("Error updating lesson:", err);
  } finally {
    isSubmitting.value = false;
  }
};

const getLessonStatusVariant = (status) => {
  return status === "unlocked"
    ? "bg-green-100 text-green-800 border-green-200"
    : "bg-orange-100 text-orange-800 border-orange-200";
};

const submitAssignments = async () => {
  if (!selectedGroup.value || selectedUnits.value.length === 0) {
    error.value = "Please select a group and at least one unit";
    return;
  }

  isSubmitting.value = true;
  error.value = "";
  successMessage.value = "";

  try {
    const assignmentPromises = selectedUnits.value.map((unit) => {
      return groupsAPI.assignUnits({
        group_id: selectedGroup.value.id,
        unit_id: unit.id,
        teacher_id: authStore.userId,
        start_date: assignmentForm.value.start_date,
        end_date: assignmentForm.value.end_date,
        status: assignmentForm.value.status,
      });
    });

    await Promise.all(assignmentPromises);

    successMessage.value = `Successfully assigned ${selectedUnits.value.length} units with all their lessons to ${selectedGroup.value.name}`;
    selectedUnits.value = [];
    window.location.reload();
  } catch (err) {
    error.value = `Failed to assign units: ${err.message || "Unknown error"}`;
    console.error("Error assigning units:", err);
  } finally {
    isSubmitting.value = false;
  }
};

// Lifecycle
onMounted(async () => {
  await Promise.all([fetchGroups(), fetchCourses()]);
});
</script>
