"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  CaretDown,
  FloppyDiskBack,
  Globe,
  Check,
  Plus,
  Trash,
  Tag,
  CircleNotch,
  CheckCircle,
  LockKey,
  PencilSimple,
  X,
  FolderSimple,
  Eraser,
  ArrowLeft,
  ArrowRight,
  FileText,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { api, handleApiError } from "@/app/lib/axios";
import { SkeletonForm } from "@/app/components/ui/Skeleton";
import { EditableSelect } from "@/app/components/ui/EditableSelect";
import { Link, useRouter } from "@/i18n/routing";

interface ExcipientItem {
  id: string;
  name: string;
  concentration: string;
  category: string;
}

interface DossierItem {
  id: string;
  dossierIdNumber: string;
  name: string;
  countryOfSubmission: string;
  typeProcedure: string;
  typeOfProcedure?: string;
  sequence: string;
  dateOfCreation: string;
  dossierSize: string;
  rawConfig?: any;
}

const formatBytes = (bytes: number): string => {
  if (!bytes || bytes <= 0) return "0 KB";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

interface DossierDataViewProps {
  projectId?: string;
  onNavigateToUpload?: () => void;
  onStatusChange?: (status: { isProjectSaved: boolean; isDossierSaved: boolean }) => void;
  onCreatingDossierChange?: (isCreating: boolean) => void;
}

export const DossierDataView: React.FC<DossierDataViewProps> = ({
  projectId = "1",
  onNavigateToUpload,
  onStatusChange,
  onCreatingDossierChange,
}) => {
  const tWorkspace = useTranslations("workspace");
  const tCommon = useTranslations("common");
  const tProjects = useTranslations("projects");
  const tErrors = useTranslations("errors");
  const tToasts = useTranslations("toasts");
  const router = useRouter();

  const [currentProjectId, setCurrentProjectId] = useState<string>(projectId);

  useEffect(() => {
    if (projectId) {
      setCurrentProjectId(projectId);
    }
  }, [projectId]);

  // Accordion & View Toggle States
  const [isProjectDataOpen, setIsProjectDataOpen] = useState<boolean>(true);
  const [isDossierDataOpen, setIsDossierDataOpen] = useState<boolean>(true);
  const [isCreatingDossier, setIsCreatingDossier] = useState<boolean>(false);
  const [editingDossierId, setEditingDossierId] = useState<string | null>(null);
  const [dossierList, setDossierList] = useState<DossierItem[]>([]);
  const [deletingDossierId, setDeletingDossierId] = useState<string | null>(null);
  const [isDeletingDossier, setIsDeletingDossier] = useState<boolean>(false);
  const [dossierPage, setDossierPage] = useState<number>(1);
  const dossierPageSize = 5;

  useEffect(() => {
    if (onCreatingDossierChange) {
      onCreatingDossierChange(isCreatingDossier);
    }
  }, [isCreatingDossier, onCreatingDossierChange]);

  // Sub-tabs state
  const [activeSubTab, setActiveSubTab] = useState<string>("Medicinal Product");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Sub-tab data status tracking for empty state display
  const [subTabHasData, setSubTabHasData] = useState<Record<string, boolean>>({
    "Active Substance": false,
    "Excipients": false,
    "Pharmaceutical Product": false,
    "Indications": false,
    "Manufacturer": false,
  });

  // Separate saving & verification status for Section 1 and Section 2
  const [isSavingProject, setIsSavingProject] = useState<boolean>(false);
  const [isSavingDossier, setIsSavingDossier] = useState<boolean>(false);
  const [isProjectSaved, setIsProjectSaved] = useState<boolean>(false);
  const [isDossierSaved, setIsDossierSaved] = useState<boolean>(false);
  const [isEditingProject, setIsEditingProject] = useState<boolean>(false);
  const [isEditingDossier, setIsEditingDossier] = useState<boolean>(false);

  // Calculated edit accessibility
  const isSection1Disabled = isProjectSaved && !isEditingProject;
  const isSection2Disabled = !isProjectSaved || (isDossierSaved && !isEditingDossier);

  const subTabs = [
    "Medicinal Product",
  ];

  const subTabsMap: Record<string, string> = {
    "Medicinal Product": tWorkspace("subTabMedicinalProduct"),
  };

  // 1. Medicinal Product Form State
  const [medicinalState, setMedicinalState] = useState({
    productName: "",
    dosageForm: "",
    strength: "",
    productType: "",
    manufacturer: "",
    mah: "",
    uaeLocalAgent: "",
    atcCode: "",
    status: "Active",
  });

  // 2. Active Substance Form State
  const [activeSubstanceState, setActiveSubstanceState] = useState({
    inn: "",
    casNumber: "",
    activeManufacturer: "",
    qualityStandard: "",
  });

  // 3. Excipients Form State
  const [excipientsList, setExcipientsList] = useState<ExcipientItem[]>([]);
  const [newExcipient, setNewExcipient] = useState({
    name: "",
    concentration: "",
    category: "Vehicle",
  });

  // 4. Pharmaceutical Product Form State
  const [pharmaceuticalState, setPharmaceuticalState] = useState({
    shelfLife: "",
    storageConditions: "",
    containerClosure: "",
    packagingSizes: "",
  });

  // 5. Indications Form State
  const [indicationsState, setIndicationsState] = useState({
    therapeuticIndications: "",
    icd10Tags: [] as string[],
    targetPopulation: "",
  });
  const [newIcd10Tag, setNewIcd10Tag] = useState("");

  // 6. Manufacturer Form State
  const [manufacturerState, setManufacturerState] = useState({
    primarySite: "",
    secondaryPackaging: "",
    batchReleaseLocation: "",
    gmpCertificate: "",
  });

  // Card 2 Configuration Form State
  const [configState, setConfigState] = useState({
    submissionCountry: "UNITED ARAB EMIRATES (AE)",
    procedureType: "National Procedure",
    typeOfProcedure: "New Marketing Authorization (MAA)",
    applicationNumber: "",
    dossierSequence: "Sequence 0000",
  });

  // Concurrency version control state
  const [projectVersion, setProjectVersion] = useState<number | undefined>(undefined);

  // Snapshots for cancel functionality
  const [savedMedicinalState, setSavedMedicinalState] = useState<typeof medicinalState | null>(null);
  const [savedConfigState, setSavedConfigState] = useState<typeof configState | null>(null);
  const [savedActiveSubstanceState, setSavedActiveSubstanceState] = useState<typeof activeSubstanceState | null>(null);
  const [savedExcipientsList, setSavedExcipientsList] = useState<typeof excipientsList | null>(null);
  const [savedPharmaceuticalState, setSavedPharmaceuticalState] = useState<typeof pharmaceuticalState | null>(null);
  const [savedIndicationsState, setSavedIndicationsState] = useState<typeof indicationsState | null>(null);
  const [savedManufacturerState, setSavedManufacturerState] = useState<typeof manufacturerState | null>(null);
  const [savedSubTabHasData, setSavedSubTabHasData] = useState<typeof subTabHasData | null>(null);

  const resetDossierForm = () => {
    setConfigState({
      submissionCountry: "UNITED ARAB EMIRATES (AE)",
      procedureType: "National Procedure",
      typeOfProcedure: "New Marketing Authorization (MAA)",
      applicationNumber: "",
      dossierSequence: "Sequence 0000",
    });
    setActiveSubstanceState({
      inn: "",
      casNumber: "",
      activeManufacturer: "",
      qualityStandard: "",
    });
    setExcipientsList([]);
    setPharmaceuticalState({
      shelfLife: "",
      storageConditions: "",
      containerClosure: "",
      packagingSizes: "",
    });
    setIndicationsState({
      therapeuticIndications: "",
      icd10Tags: [],
      targetPopulation: "",
    });
    setManufacturerState({
      primarySite: "",
      secondaryPackaging: "",
      batchReleaseLocation: "",
      gmpCertificate: "",
    });
    setSubTabHasData({
      "Active Substance": false,
      "Excipients": false,
      "Pharmaceutical Product": false,
      "Indications": false,
      "Manufacturer": false,
    });
    setEditingDossierId(null);
  };

  // Load project metadata from backend API
  useEffect(() => {
    if (!currentProjectId) return;

    if (currentProjectId === "new") {
      setMedicinalState({
        productName: "",
        dosageForm: "",
        strength: "",
        productType: "",
        manufacturer: "",
        mah: "",
        uaeLocalAgent: "",
        atcCode: "",
        status: "Active",
      });
      setSavedMedicinalState(null);
      setIsProjectSaved(false);
      setIsDossierSaved(false);
      setIsLoading(false);
      return;
    }

    const fetchDossierData = async () => {
      setIsLoading(true);
      try {
        const response = await api.get(`/projects/${currentProjectId}/dossier-data`);
        if (response.data?.success && response.data?.data) {
          const { project, dossierConfig, dossierConfigs } = response.data.data;
          let projSaved = false;
          let dosSaved = false;

          if (project) {
            if (typeof project.version === "number") {
              setProjectVersion(project.version);
            }
            const fetchedMedicinal = {
              productName: project.productName || "",
              dosageForm: project.dosageForm || "",
              strength: project.strength || "",
              productType: project.productType || "",
              manufacturer: project.manufacturer || "",
              mah: project.mahHolder || "",
              uaeLocalAgent: project.uaeLocalAgent || "",
              atcCode: project.atcCode || "",
              status: project.status || "Active",
            };
            setMedicinalState(fetchedMedicinal);
            setSavedMedicinalState(fetchedMedicinal);
            projSaved = Boolean(project.isProjectSaved);
            setIsProjectSaved(projSaved);
          }

          const rawConfigs = (dossierConfigs && Array.isArray(dossierConfigs) && dossierConfigs.length > 0)
            ? dossierConfigs
            : dossierConfig ? [dossierConfig] : [];

          const configsToUse = rawConfigs.filter((cfg: any) => Boolean(cfg.isDossierSaved));

          if (configsToUse.length > 0) {
            const rawSize = response.data?.data?.dossierSize || 0;
            const formattedSize = formatBytes(rawSize);

            const mappedList: DossierItem[] = configsToUse.map((cfg: any) => {
              const rawCountry = cfg.submissionCountry;
              const normalizedCountry = (!rawCountry || rawCountry === "US" || rawCountry === "KZ" || rawCountry === "KAZAKHSTAN") ? "UNITED ARAB EMIRATES (AE)" : rawCountry;
              const dossierIdNum = String(cfg.id).startsWith("DOS-") ? String(cfg.id) : `DOS-${String(cfg.id).padStart(4, "0")}`;
              const cfgSize = typeof cfg.dossierSize === "number" ? cfg.dossierSize : (response.data?.data?.dossierSize || 0);

              return {
                id: String(cfg.id),
                dossierIdNumber: dossierIdNum,
                name: project?.productName || "Main Dossier",
                countryOfSubmission: normalizedCountry,
                typeProcedure: cfg.procedureType || "National Procedure",
                typeOfProcedure: cfg.typeOfProcedure || "New Marketing Authorization (MAA)",
                sequence: cfg.dossierSequence || "Sequence 0000",
                dateOfCreation: project?.createdAt
                  ? new Date(project.createdAt).toLocaleDateString("en-GB")
                  : new Date().toLocaleDateString("en-GB"),
                dossierSize: formatBytes(cfgSize),
                rawConfig: cfg,
              };
            });

            setDossierList(mappedList);
            dosSaved = true;
            setIsDossierSaved(true);

            const latestConfig = configsToUse[configsToUse.length - 1];
            if (latestConfig) {
              const rawCountry = latestConfig.submissionCountry;
              const normalizedCountry = (!rawCountry || rawCountry === "US" || rawCountry === "KZ" || rawCountry === "KAZAKHSTAN") ? "UNITED ARAB EMIRATES (AE)" : rawCountry;
              const rawAppNum = latestConfig.applicationNumber || "";
              const isAppNumDefaultOrId =
                !rawAppNum ||
                rawAppNum === "KZ-MOH-2026-88192" ||
                (project && (rawAppNum === project.projectCode || rawAppNum === String(project.id)));
              const cleanedAppNum = isAppNumDefaultOrId ? "" : rawAppNum;

              const fetchedConfig = {
                submissionCountry: normalizedCountry,
                procedureType: latestConfig.procedureType || "National Procedure",
                typeOfProcedure: latestConfig.typeOfProcedure || "New Marketing Authorization (MAA)",
                applicationNumber: cleanedAppNum,
                dossierSequence: latestConfig.dossierSequence || "Sequence 0000",
              };
              setConfigState(fetchedConfig);
              setSavedConfigState(fetchedConfig);
              if (typeof window !== "undefined") {
                sessionStorage.setItem(`active_dossier_sequence_${currentProjectId}`, latestConfig.dossierSequence || "Sequence 0000");
                sessionStorage.setItem(`active_dossier_id_${currentProjectId}`, String(latestConfig.id));
              }

              if (latestConfig.dossierDetails) {
                const details = latestConfig.dossierDetails;
                const hasDataMap: Record<string, boolean> = {
                  "Active Substance": false,
                  "Excipients": false,
                  "Pharmaceutical Product": false,
                  "Indications": false,
                  "Manufacturer": false,
                };
                if (details.activeSubstance) {
                  setActiveSubstanceState(details.activeSubstance);
                  setSavedActiveSubstanceState(details.activeSubstance);
                  if (Object.values(details.activeSubstance).some((v) => Boolean(v))) hasDataMap["Active Substance"] = true;
                }
                if (details.excipients && Array.isArray(details.excipients)) {
                  setExcipientsList(details.excipients);
                  setSavedExcipientsList(details.excipients);
                  if (details.excipients.length > 0) hasDataMap["Excipients"] = true;
                }
                if (details.pharmaceutical) {
                  setPharmaceuticalState(details.pharmaceutical);
                  setSavedPharmaceuticalState(details.pharmaceutical);
                  if (Object.values(details.pharmaceutical).some((v) => Boolean(v))) hasDataMap["Pharmaceutical Product"] = true;
                }
                if (details.indications) {
                  setIndicationsState(details.indications);
                  setSavedIndicationsState(details.indications);
                  if (details.indications.therapeuticIndications || details.indications.targetPopulation || (details.indications.icd10Tags && details.indications.icd10Tags.length > 0)) hasDataMap["Indications"] = true;
                }
                if (details.manufacturer) {
                  setManufacturerState(details.manufacturer);
                  setSavedManufacturerState(details.manufacturer);
                  if (Object.values(details.manufacturer).some((v) => Boolean(v))) hasDataMap["Manufacturer"] = true;
                }
                setSubTabHasData(hasDataMap);
                setSavedSubTabHasData(hasDataMap);
              }
            }
          } else {
            setDossierList([]);
            dosSaved = false;
            setIsDossierSaved(false);
          }

          if (onStatusChange) {
            onStatusChange({ isProjectSaved: projSaved, isDossierSaved: dosSaved });
          }
        }
      } catch (err: any) {
        console.warn("Could not fetch project dossier data from API:", err?.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDossierData();
  }, [currentProjectId, onStatusChange]);

  // Delete dossier configuration handler
  const handleDeleteDossier = async (targetDosId?: string) => {
    const dosId = targetDosId || deletingDossierId;
    if (!currentProjectId || !dosId) return;
    setIsDeletingDossier(true);
    try {
      await api.delete(`/projects/${currentProjectId}/dossier-config/${dosId}`);
      const remaining = dossierList.filter((d) => d.id !== dosId);
      setDossierList(remaining);
      if (remaining.length === 0) {
        setIsDossierSaved(false);
        setIsEditingDossier(false);
        setIsCreatingDossier(false);
        resetDossierForm();
      }
      if (onStatusChange) {
        onStatusChange({ isProjectSaved, isDossierSaved: remaining.length > 0 });
      }
      toast.success(tToasts("dossierConfigDeleted"));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || tToasts("failedDeleteDossierConfig"));
    } finally {
      setIsDeletingDossier(false);
      setDeletingDossierId(null);
    }
  };

  // Section 1: Save Project Data
  const handleSaveCard1 = async () => {
    if (!medicinalState.productName.trim()) {
      toast.error(tToasts("drugSubstanceNameRequired"));
      return;
    }
    setIsSavingProject(true);
    try {
      const payload = {
        version: projectVersion,
        productName: medicinalState.productName.trim(),
        dosageForm: medicinalState.dosageForm,
        strength: medicinalState.strength,
        productType: medicinalState.productType,
        manufacturer: medicinalState.manufacturer,
        mahHolder: medicinalState.mah,
        uaeLocalAgent: medicinalState.uaeLocalAgent,
        atcCode: medicinalState.atcCode,
        status: medicinalState.status || "Active",
      };

      let response;
      if (currentProjectId === "new") {
        response = await api.post("/projects", payload);
      } else {
        response = await api.put(`/projects/${currentProjectId}/dossier-data`, payload);
      }

      if (response.data?.success) {
        const createdOrUpdated = response.data.data?.project;
        if (createdOrUpdated) {
          if (typeof createdOrUpdated.version === "number") {
            setProjectVersion(createdOrUpdated.version);
          }
          const realId = String(createdOrUpdated.id);
          if (realId) {
            setCurrentProjectId(realId);
            if (typeof window !== "undefined") {
              window.history.replaceState(null, "", `/projects/${realId}?tab=dossier-data`);
            }
            router.replace(`/projects/${realId}?tab=dossier-data`);
          }
        }
        setSavedMedicinalState(medicinalState);
        setIsProjectSaved(true);
        setIsEditingProject(false);
        if (onStatusChange) {
          onStatusChange({ isProjectSaved: true, isDossierSaved });
        }
        toast.success(tToasts("projectDataSaved"));
      }
    } catch (err: any) {
      if (err?.response?.status === 409) {
        toast.error(
          "Conflict: Another team member has updated this dossier data. Please refresh and try again.",
          { duration: 6000 }
        );
      } else {
        handleApiError(err, "Failed to save project data");
      }
    } finally {
      setIsSavingProject(false);
    }
  };

  // Medicinal Product Metadata: Cancel Handler
  const handleCancelCard1 = () => {
    if (savedMedicinalState) {
      setMedicinalState(savedMedicinalState);
    }
    setIsEditingProject(false);
    toast(tToasts("editingProjectDataCancelled"));
  };

  // Medicinal Product Metadata: Clear Handler
  const handleClearCard1 = () => {
    setMedicinalState({
      productName: "",
      dosageForm: "",
      strength: "",
      productType: "",
      manufacturer: "",
      mah: "",
      uaeLocalAgent: "",
      atcCode: "",
      status: "Active",
    });
    setActiveSubstanceState({
      inn: "",
      casNumber: "",
      activeManufacturer: "",
      qualityStandard: "",
    });
    setExcipientsList([]);
    setPharmaceuticalState({
      shelfLife: "",
      storageConditions: "",
      containerClosure: "",
      packagingSizes: "",
    });
    setIndicationsState({
      therapeuticIndications: "",
      icd10Tags: [],
      targetPopulation: "",
    });
    setManufacturerState({
      primarySite: "",
      secondaryPackaging: "",
      batchReleaseLocation: "",
      gmpCertificate: "",
    });
    setSubTabHasData({
      "Active Substance": false,
      "Excipients": false,
      "Pharmaceutical Product": false,
      "Indications": false,
      "Manufacturer": false,
    });
    toast.success(tToasts("projectMetadataCleared"));
  };

  // Medicinal Product Metadata: Edit Handler
  const handleEditCard1 = async () => {
    if (isEditingProject) {
      await handleSaveCard1();
    } else {
      setSavedMedicinalState(medicinalState);
      setIsEditingProject(true);
      toast.success(tToasts("projectDataEditEnabled"));
    }
  };

  // Dossier Data Configuration: Save Handler
  const handleSaveCard2 = async () => {
    if (!isProjectSaved) {
      toast.error(tToasts("saveProjectDataFirstToActivate"));
      return;
    }
    if (!configState.submissionCountry || !configState.procedureType) {
      toast.error(tToasts("countryAndProcedureRequired"));
      return;
    }
    setIsSavingDossier(true);
    try {
      const dossierDetailsPayload = {
        activeSubstance: activeSubstanceState,
        excipients: excipientsList,
        pharmaceutical: pharmaceuticalState,
        indications: indicationsState,
        manufacturer: manufacturerState,
      };

      const payload = {
        version: projectVersion,
        createNewDossier: editingDossierId === null,
        dossierConfigId: editingDossierId || undefined,
        submissionCountry: configState.submissionCountry,
        procedureType: configState.procedureType,
        typeOfProcedure: configState.typeOfProcedure,
        applicationNumber: configState.applicationNumber,
        dossierSequence: configState.dossierSequence,
        dossierDetails: dossierDetailsPayload,
      };

      const response = await api.put(`/projects/${currentProjectId}/dossier-data`, payload);
      if (response.data?.success) {
        if (response.data?.data?.project?.version) {
          setProjectVersion(response.data.data.project.version);
        }
        setSavedConfigState(configState);
        setSavedActiveSubstanceState(activeSubstanceState);
        setSavedExcipientsList(excipientsList);
        setSavedPharmaceuticalState(pharmaceuticalState);
        setSavedIndicationsState(indicationsState);
        setSavedManufacturerState(manufacturerState);
        setSavedSubTabHasData(subTabHasData);
        setIsDossierSaved(true);
        setIsEditingDossier(false);

        // Update dossierList from returned dossierConfigs array or single dossierConfig
        const rawReturned = response.data?.data?.dossierConfigs || (response.data?.data?.dossierConfig ? [response.data.data.dossierConfig] : []);
        const returnedConfigs = rawReturned.filter((cfg: any) => Boolean(cfg.isDossierSaved));
        if (returnedConfigs.length > 0) {
          const rawSize = response.data?.data?.dossierSize || 0;
          const formattedSize = formatBytes(rawSize);
          const updatedItems: DossierItem[] = returnedConfigs.map((cfg: any) => {
            const rawCountry = cfg.submissionCountry;
            const normalizedCountry = (!rawCountry || rawCountry === "US" || rawCountry === "KZ" || rawCountry === "KAZAKHSTAN") ? "UNITED ARAB EMIRATES (AE)" : rawCountry;
            const dossierIdNum = String(cfg.id).startsWith("DOS-") ? String(cfg.id) : `DOS-${String(cfg.id).padStart(4, "0")}`;
            const cfgSize = typeof cfg.dossierSize === "number" ? cfg.dossierSize : (response.data?.data?.dossierSize || 0);
            return {
              id: String(cfg.id),
              dossierIdNumber: dossierIdNum,
              name: medicinalState.productName || "Main Dossier",
              countryOfSubmission: normalizedCountry,
              typeProcedure: cfg.procedureType || "National Procedure",
              typeOfProcedure: cfg.typeOfProcedure || "New Marketing Authorization (MAA)",
              sequence: cfg.dossierSequence || "Sequence 0000",
              dateOfCreation: new Date().toLocaleDateString("en-GB"),
              dossierSize: formatBytes(cfgSize),
              rawConfig: cfg,
            };
          });
          setDossierList(updatedItems);
          const activeItem = updatedItems[updatedItems.length - 1];
          if (activeItem && typeof window !== "undefined") {
            sessionStorage.setItem(`active_dossier_sequence_${currentProjectId}`, activeItem.sequence);
            sessionStorage.setItem(`active_dossier_id_${currentProjectId}`, String(activeItem.id));
          }
        }

        // Return to the Created Dossiers list view
        setIsCreatingDossier(false);
        setEditingDossierId(null);

        if (onStatusChange) {
          onStatusChange({ isProjectSaved: true, isDossierSaved: true });
        }
        toast.success(tToasts("dossierConfigSaved"));
      }
    } catch (err: any) {
      if (err?.response?.status === 409) {
        toast.error(
          "Conflict: Another team member has updated this dossier data. Please refresh and try again.",
          { duration: 6000 }
        );
      } else {
        handleApiError(err, "Failed to save dossier configuration");
      }
    } finally {
      setIsSavingDossier(false);
    }
  };

  // Section 2: Cancel Handler
  const handleCancelCard2 = () => {
    if (savedConfigState) setConfigState(savedConfigState);
    if (savedActiveSubstanceState) setActiveSubstanceState(savedActiveSubstanceState);
    if (savedExcipientsList) setExcipientsList(savedExcipientsList);
    if (savedPharmaceuticalState) setPharmaceuticalState(savedPharmaceuticalState);
    if (savedIndicationsState) setIndicationsState(savedIndicationsState);
    if (savedManufacturerState) setManufacturerState(savedManufacturerState);
    if (savedSubTabHasData) setSubTabHasData(savedSubTabHasData);
    setIsEditingDossier(false);
    toast(tToasts("editingDossierConfigCancelled"));
  };

  // Section 2: Edit Handler
  const handleEditCard2 = async () => {
    if (isEditingDossier) {
      await handleSaveCard2();
    } else {
      setSavedConfigState(configState);
      setSavedActiveSubstanceState(activeSubstanceState);
      setSavedExcipientsList(excipientsList);
      setSavedPharmaceuticalState(pharmaceuticalState);
      setSavedIndicationsState(indicationsState);
      setSavedManufacturerState(manufacturerState);
      setSavedSubTabHasData(subTabHasData);
      setIsEditingDossier(true);
      toast.success(tToasts("dossierDataEditEnabled"));
    }
  };

  const handleAddExcipient = () => {
    if (isSection1Disabled) return;
    if (!newExcipient.name || !newExcipient.concentration) {
      toast.error(tToasts("excipientNameAndConcRequired"));
      return;
    }
    const item: ExcipientItem = {
      id: `exc-${Date.now()}`,
      name: newExcipient.name,
      concentration: newExcipient.concentration,
      category: newExcipient.category,
    };
    setExcipientsList([...excipientsList, item]);
    setNewExcipient({ name: "", concentration: "", category: "Vehicle" });
    toast.success(tToasts("excipientAdded"));
  };

  const handleDeleteExcipient = (id: string) => {
    if (isSection1Disabled) return;
    setExcipientsList(excipientsList.filter((e) => e.id !== id));
    toast.error(tToasts("excipientRemoved"));
  };

  const handleAddIcd10Tag = () => {
    if (isSection1Disabled) return;
    if (!newIcd10Tag.trim()) return;
    if (indicationsState.icd10Tags.includes(newIcd10Tag.trim())) {
      toast.error(tToasts("tagAlreadyExists"));
      return;
    }
    setIndicationsState({
      ...indicationsState,
      icd10Tags: [...indicationsState.icd10Tags, newIcd10Tag.trim()],
    });
    setNewIcd10Tag("");
  };

  const handleRemoveIcd10Tag = (tag: string) => {
    if (isSection1Disabled) return;
    setIndicationsState({
      ...indicationsState,
      icd10Tags: indicationsState.icd10Tags.filter((t) => t !== tag),
    });
  };

  // Helper renderers with green tick & disabled/edit support
  const renderTextInput = (
    label: string,
    value: string,
    onChange: (val: string) => void,
    isSaved: boolean,
    isDisabled?: boolean,
    required?: boolean,
    placeholder?: string,
    extraClasses?: string
  ) => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-secondary">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
        {isSaved && (
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
            <CheckCircle size={12} weight="fill" />
            {tWorkspace("validStatus")}
          </span>
        )}
      </div>
      <div className="relative flex items-center">
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          disabled={isDisabled}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-bg border ${isDisabled
            ? "border-border/60 text-secondary bg-surface-raised/40 cursor-not-allowed opacity-75"
            : isSaved
              ? "border-emerald-500/70 focus:border-emerald-500 bg-emerald-950/10 text-primary"
              : "border-border focus:border-accent text-primary"
            } text-xs rounded-xl px-3 py-2.5 ${isSaved ? "pr-9" : ""} focus:outline-none transition-all ${extraClasses || ""
            }`}
        />
        {isSaved && (
          <CheckCircle
            size={16}
            weight="fill"
            className="absolute right-2.5 text-emerald-400 pointer-events-none z-10"
          />
        )}
      </div>
    </div>
  );

  const renderSelectInput = (
    label: string,
    value: string,
    onChange: (val: string) => void,
    options: { label: string; value: string }[],
    isSaved: boolean,
    isDisabled?: boolean,
    required?: boolean
  ) => (
    <EditableSelect
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      isSaved={isSaved}
      isDisabled={isDisabled}
      required={required}
    />
  );

  const renderTextareaInput = (
    label: string,
    value: string,
    onChange: (val: string) => void,
    isSaved: boolean,
    isDisabled?: boolean,
    rows: number = 2
  ) => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-secondary">{label}</label>
        {isSaved && (
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
            <CheckCircle size={12} weight="fill" />
            {tWorkspace("validStatus")}
          </span>
        )}
      </div>
      <div className="relative flex items-center">
        <textarea
          rows={rows}
          value={value}
          disabled={isDisabled}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-bg border ${isDisabled
            ? "border-border/60 text-secondary bg-surface-raised/40 cursor-not-allowed opacity-75"
            : isSaved
              ? "border-emerald-500/70 focus:border-emerald-500 bg-emerald-950/10 text-primary"
              : "border-border focus:border-accent text-primary"
            } text-xs rounded-xl p-3 ${isSaved ? "pr-9" : ""} focus:outline-none resize-none transition-all`}
        />
        {isSaved && (
          <CheckCircle
            size={16}
            weight="fill"
            className="absolute right-2.5 top-3 text-emerald-400 pointer-events-none z-10"
          />
        )}
      </div>
    </div>
  );

  // Empty state renderer for sub-tabs with no data
  const renderEmptySubTabState = (tabName: string) => (
    <div className="py-10 px-6 text-center border-2 border-dashed border-border/80 rounded-2xl bg-bg/40 space-y-4">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-surface-raised border border-border flex items-center justify-center text-secondary shadow-xs">
        <FolderSimple size={28} className="text-accent" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-primary">
          {tWorkspace("noSubTabDataTitle", { tabName: subTabsMap[tabName] || tabName })}
        </h3>
        <p className="text-xs text-secondary max-w-md mx-auto leading-relaxed">
          {tWorkspace("noSubTabDataDesc")}
        </p>
      </div>
      <button
        onClick={() => setSubTabHasData({ ...subTabHasData, [tabName]: true })}
        disabled={isSection1Disabled}
        type="button"
        className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
      >
        <Plus size={16} weight="bold" />
        <span>{tWorkspace("addSubTabDataBtn", { tabName: subTabsMap[tabName] || tabName })}</span>
      </button>
    </div>
  );

  if (isLoading) {
    return <SkeletonForm />;
  }

  return (
    <div className="space-y-6">

      {/* Delete Dossier Confirmation Modal */}
      {deletingDossierId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <Trash size={20} className="text-red-400" weight="fill" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-primary">{tWorkspace("deleteDossierConfigTitle")}</h3>
                <p className="text-xs text-secondary mt-1">
                  {tWorkspace("deleteDossierConfigMsg")}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingDossierId(null)}
                disabled={isDeletingDossier}
                className="px-4 py-2 text-xs font-semibold text-secondary hover:text-primary bg-surface-raised hover:bg-border border border-border rounded-xl transition-colors cursor-pointer"
              >
                {tWorkspace("cancelBtn")}
              </button>
              <button
                onClick={() => handleDeleteDossier()}
                disabled={isDeletingDossier}
                className="px-4 py-2 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isDeletingDossier ? (
                  <CircleNotch size={14} className="animate-spin" />
                ) : (
                  <Trash size={14} weight="bold" />
                )}
                {isDeletingDossier ? tWorkspace("deleting") : tCommon("delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {!isCreatingDossier && (
        <>
          {/* Introduction Banner */}
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-lg md:text-xl font-bold font-lexend text-primary flex items-center gap-2">
                <FolderSimple size={24} className="text-accent" weight="fill" />
                {tWorkspace("bannerTitle")}
              </h1>
              <p className="text-xs text-secondary max-w-2xl leading-relaxed">
                {tWorkspace("bannerSub")}
              </p>
            </div>

            <Link
              href="/projects"
              className="px-4 py-2 bg-surface-raised hover:bg-border text-primary text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 shrink-0 active:scale-95 border border-border cursor-pointer"
            >
              <ArrowLeft size={16} weight="bold" />
              <span>{tWorkspace("backToProjects")}</span>
            </Link>
          </div>

          {/* CARD 1: Project Data (Metadata Form) */}
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-6">
            {/* Card Header (Accordion Toggle) */}
            <div
              onClick={() => setIsProjectDataOpen(!isProjectDataOpen)}
              className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border cursor-pointer select-none"
            >
              <div className="flex items-center gap-2.5">
                <CaretDown
                  size={18}
                  className={`text-secondary transition-transform duration-200 ${isProjectDataOpen ? "rotate-0" : "-rotate-90"
                    }`}
                />
                <h2 className="font-lexend font-bold text-base md:text-lg text-primary">
                  {tWorkspace("section1Title")}
                </h2>
              </div>
              {isProjectSaved ? (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle size={14} weight="fill" />
                  {isEditingProject ? tWorkspace("editingStatus") : tWorkspace("savedStatus")}
                </span>
              ) : (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-wider">
                  {subTabsMap[activeSubTab]?.toUpperCase()}
                </span>
              )}
            </div>

            {isProjectDataOpen && (
              <>
                {/* Horizontal Sub-Tabs Bar */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {subTabs.map((tab) => {
                    const isActive = activeSubTab === tab;
                    const hasData = tab === "Medicinal Product" || subTabHasData[tab];
                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveSubTab(tab)}
                        type="button"
                        className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${isActive
                          ? "bg-accent text-white shadow-xs"
                          : "bg-surface-raised text-secondary hover:text-primary hover:bg-border border border-border"
                          }`}
                      >
                        <span>{subTabsMap[tab] || tab}</span>
                        {hasData && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-white" : "bg-emerald-400"}`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* SUB-TAB 1: Medicinal Product */}
                {activeSubTab === "Medicinal Product" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {renderTextInput(
                      tProjects("formProductName"),
                      medicinalState.productName,
                      (val) => setMedicinalState({ ...medicinalState, productName: val }),
                      isProjectSaved,
                      isSection1Disabled
                    )}
                    {renderSelectInput(
                      tProjects("formDosageForm"),
                      medicinalState.dosageForm,
                      (val) => setMedicinalState({ ...medicinalState, dosageForm: val }),
                      [
                        // Solid Oral
                        { label: "Tablet", value: "Tablet" },
                        { label: "Film-coated tablet", value: "Film-coated tablet" },
                        { label: "Chewable tablet", value: "Chewable tablet" },
                        { label: "Dispersible tablet", value: "Dispersible tablet" },
                        { label: "Effervescent tablet", value: "Effervescent tablet" },
                        { label: "Hard capsule", value: "Hard capsule" },
                        { label: "Soft capsule", value: "Soft capsule" },
                        { label: "Powder for oral solution", value: "Powder for oral solution" },
                        { label: "Granules", value: "Granules" },
                        // Liquid Oral
                        { label: "Oral solution", value: "Oral solution" },
                        { label: "Oral suspension", value: "Oral suspension" },
                        { label: "Syrup", value: "Syrup" },
                        { label: "Oral drops", value: "Oral drops" },
                        // Parenteral
                        { label: "Solution for injection", value: "Solution for injection" },
                        { label: "Powder for solution for injection", value: "Powder for solution for injection" },
                        { label: "Concentrate for solution for infusion", value: "Concentrate for solution for infusion" },
                        { label: "Suspension for injection", value: "Suspension for injection" },
                        // Topical / Semi-solid
                        { label: "Cream", value: "Cream" },
                        { label: "Ointment", value: "Ointment" },
                        { label: "Gel", value: "Gel" },
                        { label: "Cutaneous solution", value: "Cutaneous solution" },
                        { label: "Transdermal patch", value: "Transdermal patch" },
                        // Ophthalmic / Otic / Nasal
                        { label: "Eye drops, solution", value: "Eye drops, solution" },
                        { label: "Eye ointment", value: "Eye ointment" },
                        { label: "Ear drops, solution", value: "Ear drops, solution" },
                        { label: "Nasal spray, solution", value: "Nasal spray, solution" },
                        // Inhalation
                        { label: "Pressurised inhalation, solution", value: "Pressurised inhalation, solution" },
                        { label: "Inhalation powder", value: "Inhalation powder" },
                        { label: "Nebuliser solution", value: "Nebuliser solution" },
                      ],
                      isProjectSaved,
                      isSection1Disabled
                    )}
                    {renderTextInput(
                      tProjects("formStrength"),
                      medicinalState.strength,
                      (val) => setMedicinalState({ ...medicinalState, strength: val }),
                      isProjectSaved,
                      isSection1Disabled
                    )}
                    {renderSelectInput(
                      tProjects("formProductType"),
                      medicinalState.productType,
                      (val) => setMedicinalState({ ...medicinalState, productType: val }),
                      [
                        { label: "New Chemical Entity (NCE / Innovator)", value: "New Chemical Entity (NCE / Innovator)" },
                        { label: "Generic", value: "Generic" },
                        { label: "Biological / Biosimilar", value: "Biological / Biosimilar" },
                        { label: "Vaccine", value: "Vaccine" },
                        { label: "Herbal / Traditional Medicine", value: "Herbal / Traditional Medicine" },
                        { label: "Health Supplement / Dietary Supplement", value: "Health Supplement / Dietary Supplement" },
                        { label: "Radiopharmaceutical", value: "Radiopharmaceutical" },
                      ],
                      isProjectSaved,
                      isSection1Disabled
                    )}
                    {renderTextInput(
                      tProjects("formManufacturer"),
                      medicinalState.manufacturer,
                      (val) => setMedicinalState({ ...medicinalState, manufacturer: val }),
                      isProjectSaved,
                      isSection1Disabled
                    )}
                    {renderTextInput(
                      tProjects("formMah"),
                      medicinalState.mah,
                      (val) => setMedicinalState({ ...medicinalState, mah: val }),
                      isProjectSaved,
                      isSection1Disabled
                    )}
                    {renderTextInput(
                      tProjects("formUaeLocalAgent"),
                      medicinalState.uaeLocalAgent,
                      (val) => setMedicinalState({ ...medicinalState, uaeLocalAgent: val }),
                      isProjectSaved,
                      isSection1Disabled
                    )}
                    {renderTextInput(
                      tProjects("formAtcCode"),
                      medicinalState.atcCode,
                      (val) => setMedicinalState({ ...medicinalState, atcCode: val }),
                      isProjectSaved,
                      isSection1Disabled
                    )}
                  </div>
                )}

                {/* Card 1 Footer Actions */}
                <div className="flex justify-end items-center gap-3 pt-2 border-t border-border">
                  <button
                    onClick={handleClearCard1}
                    disabled={isSection1Disabled}
                    type="button"
                    className="px-3.5 py-1.5 bg-surface-raised hover:bg-border text-secondary hover:text-primary border border-border text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-xs"
                  >
                    <Eraser size={15} weight="bold" />
                    <span>{tWorkspace("clear")}</span>
                  </button>
                  {isProjectSaved ? (
                    <div className="flex items-center gap-3">
                      {isEditingProject && (
                        <button
                          onClick={handleCancelCard1}
                          type="button"
                          className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white border border-red-500/40 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
                        >
                          <X size={15} weight="bold" />
                          <span>{tWorkspace("cancelBtn")}</span>
                        </button>
                      )}
                      <button
                        onClick={handleEditCard1}
                        disabled={isSavingProject}
                        type="button"
                        className={`px-3.5 py-1.5 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 border ${isEditingProject ? "bg-[#3178c6] hover:bg-[#2766ab] border-[#3178c6]/40" : "bg-amber-600 hover:bg-amber-500 border-amber-400/40"}`}
                      >
                        {isSavingProject ? (
                          <CircleNotch size={15} className="animate-spin" />
                        ) : isEditingProject ? (
                          <FloppyDiskBack size={15} weight="fill" />
                        ) : (
                          <PencilSimple size={15} weight="bold" />
                        )}
                        <span>
                          {isSavingProject
                            ? tWorkspace("updating")
                            : isEditingProject
                              ? tWorkspace("btnSaveSection1")
                              : tWorkspace("btnEditSection1")}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleSaveCard1}
                      disabled={isSavingProject}
                      type="button"
                      className="px-3.5 py-1.5 bg-[#3178c6] hover:bg-[#2766ab] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 border border-[#3178c6]/40"
                    >
                      {isSavingProject ? (
                        <CircleNotch size={15} className="animate-spin" />
                      ) : (
                        <FloppyDiskBack size={15} weight="fill" />
                      )}
                      <span>{isSavingProject ? tWorkspace("saving") : tWorkspace("btnSaveSection1")}</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* CARD 2: Dossier Data Accordion */}
      <div
        className={`bg-surface border transition-all rounded-2xl p-6 shadow-sm space-y-6 ${!isProjectSaved ? "opacity-90 border-border/80" : "border-border"
          }`}
      >
        {/* Card Header (Accordion Toggle + Create Button) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border">
          <div
            onClick={() => setIsDossierDataOpen(!isDossierDataOpen)}
            className="flex items-center gap-2.5 cursor-pointer select-none flex-1"
          >
            <CaretDown
              size={18}
              className={`text-secondary transition-transform duration-200 ${isDossierDataOpen ? "rotate-0" : "-rotate-90"
                }`}
            />
            <Globe size={20} className={isProjectSaved ? "text-accent" : "text-secondary"} />
            <h2 className="font-lexend font-bold text-base md:text-lg text-primary flex items-center gap-2">
              <span>{tWorkspace("section2Title")}</span>
              {!isProjectSaved && <LockKey size={16} className="text-amber-400" />}
            </h2>
            {!isProjectSaved ? (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider flex items-center gap-1.5 ml-2">
                <LockKey size={14} weight="bold" />
                {tWorkspace("lockedStatus")}
              </span>
            ) : isDossierSaved ? (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider flex items-center gap-1.5 ml-2">
                <CheckCircle size={14} weight="fill" />
                {isEditingDossier ? tWorkspace("editingStatus") : tWorkspace("savedStatus")}
              </span>
            ) : null}
          </div>

          {isCreatingDossier ? (
            <button
              onClick={() => {
                setIsCreatingDossier(false);
                setEditingDossierId(null);
              }}
              type="button"
              className="px-4 py-2 bg-surface-raised hover:bg-border text-primary text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95 border border-border"
            >
              <ArrowLeft size={15} weight="bold" />
              <span>{tWorkspace("backToList")}</span>
            </button>
          ) : (
            <button
              onClick={() => {
                if (!isProjectSaved) {
                  toast.error(tErrors("saveProjectDataFirst"));
                  return;
                }
                resetDossierForm();
                setIsCreatingDossier(true);
                setIsDossierDataOpen(true);
                setIsProjectDataOpen(false);
                setIsEditingDossier(true);
              }}
              type="button"
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
            >
              <Plus size={15} weight="bold" />
              <span>{tWorkspace("createDossier")}</span>
            </button>
          )}
        </div>

        {isDossierDataOpen && (
          <>
            {!isCreatingDossier ? (
              <div>
                {dossierList.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-secondary uppercase tracking-wider">
                        {tWorkspace("createdDossiers", { count: dossierList.length })}
                      </h3>
                    </div>
                    <div className="border border-border rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs text-secondary">
                        <thead className="bg-bg text-primary uppercase font-bold text-[10px] tracking-wider border-b border-border">
                          <tr>
                            <th className="py-3 px-4">{tWorkspace("colDossierIdNumber")}</th>
                            <th className="py-3 px-4">{tWorkspace("colCountryOfSubmission")}</th>
                            <th className="py-3 px-4">{tWorkspace("colTypeProcedure")}</th>
                            <th className="py-3 px-4">{tWorkspace("colSequence")}</th>
                            <th className="py-3 px-4">{tWorkspace("colDateOfCreation")}</th>
                            <th className="py-3 px-4">{tWorkspace("colDossierSize")}</th>
                            <th className="py-3 px-4 text-center">{tWorkspace("colActions")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-surface">
                          {dossierList
                            .slice((dossierPage - 1) * dossierPageSize, dossierPage * dossierPageSize)
                            .map((dos) => (
                              <tr key={dos.id} className="hover:bg-surface-raised transition-colors">
                                <td className="py-3 px-4 font-semibold text-primary">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle size={15} weight="fill" className="text-emerald-400 shrink-0" />
                                    <span className="font-mono font-bold text-accent">{dos.dossierIdNumber}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 font-semibold text-primary uppercase">{dos.countryOfSubmission}</td>
                                <td className="py-3 px-4 text-secondary">{dos.typeProcedure}</td>
                                <td className="py-3 px-4 font-mono font-bold text-sky-400">{dos.sequence}</td>
                                <td className="py-3 px-4 text-secondary font-medium">{dos.dateOfCreation}</td>
                                <td className="py-3 px-4 font-mono font-bold text-emerald-400">{dos.dossierSize}</td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => {
                                        setEditingDossierId(dos.id);
                                        if (typeof window !== "undefined") {
                                          sessionStorage.setItem(`active_dossier_sequence_${projectId}`, dos.sequence);
                                          sessionStorage.setItem(`active_dossier_id_${projectId}`, String(dos.id));
                                        }
                                        if (dos.rawConfig) {
                                          setConfigState({
                                            submissionCountry: dos.rawConfig.submissionCountry || "UNITED ARAB EMIRATES (AE)",
                                            procedureType: dos.rawConfig.procedureType || "National Procedure",
                                            typeOfProcedure: dos.rawConfig.typeOfProcedure || "New Marketing Authorization (MAA)",
                                            applicationNumber: dos.rawConfig.applicationNumber || "",
                                            dossierSequence: dos.rawConfig.dossierSequence || "Sequence 0000",
                                          });
                                          if (dos.rawConfig.dossierDetails) {
                                            const details = dos.rawConfig.dossierDetails;
                                            if (details.activeSubstance) setActiveSubstanceState(details.activeSubstance);
                                            if (details.excipients) setExcipientsList(details.excipients);
                                            if (details.pharmaceutical) setPharmaceuticalState(details.pharmaceutical);
                                            if (details.indications) setIndicationsState(details.indications);
                                            if (details.manufacturer) setManufacturerState(details.manufacturer);
                                          }
                                        }
                                        setIsCreatingDossier(true);
                                        setIsEditingDossier(true);
                                        setIsProjectDataOpen(false);
                                      }}
                                      title="Edit dossier configuration"
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 hover:bg-accent/20 text-accent text-xs font-semibold rounded-lg transition-colors border border-accent/20 cursor-pointer"
                                    >
                                      <PencilSimple size={13} weight="bold" />
                                      {tCommon("edit")}
                                    </button>
                                    <button
                                      onClick={() => setDeletingDossierId(dos.id)}
                                      title="Delete dossier configuration"
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold rounded-lg transition-colors border border-red-500/20 cursor-pointer"
                                    >
                                      <Trash size={13} weight="bold" />
                                      {tCommon("delete")}
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingDossierId(dos.id);
                                        if (typeof window !== "undefined") {
                                          sessionStorage.setItem(`active_dossier_sequence_${projectId}`, dos.sequence);
                                          sessionStorage.setItem(`active_dossier_id_${projectId}`, String(dos.id));
                                        }
                                        if (dos.rawConfig) {
                                          setConfigState({
                                            submissionCountry: dos.rawConfig.submissionCountry || "UNITED ARAB EMIRATES (AE)",
                                            procedureType: dos.rawConfig.procedureType || "National Procedure",
                                            typeOfProcedure: dos.rawConfig.typeOfProcedure || "New Marketing Authorization (MAA)",
                                            applicationNumber: dos.rawConfig.applicationNumber || "",
                                            dossierSequence: dos.rawConfig.dossierSequence || "Sequence 0000",
                                          });
                                          if (dos.rawConfig.dossierDetails) {
                                            const details = dos.rawConfig.dossierDetails;
                                            if (details.activeSubstance) setActiveSubstanceState(details.activeSubstance);
                                            if (details.excipients) setExcipientsList(details.excipients);
                                            if (details.pharmaceutical) setPharmaceuticalState(details.pharmaceutical);
                                            if (details.indications) setIndicationsState(details.indications);
                                            if (details.manufacturer) setManufacturerState(details.manufacturer);
                                          }
                                        }
                                        setIsCreatingDossier(true);
                                        setIsEditingDossier(false);
                                        setIsProjectDataOpen(false);
                                      }}
                                      title="View Dossier Data Configuration"
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3178c6]/10 hover:bg-[#3178c6]/20 text-[#3178c6] dark:text-sky-400 text-xs font-semibold rounded-lg transition-colors border border-[#3178c6]/30 cursor-pointer"
                                    >
                                      <ArrowRight size={15} weight="bold" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination for Created Dossiers */}
                    {Math.ceil(dossierList.length / dossierPageSize) > 1 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border text-xs text-secondary">
                        <div>
                          {tWorkspace("showingDossiers", {
                            start: (dossierPage - 1) * dossierPageSize + 1,
                            end: Math.min(dossierPage * dossierPageSize, dossierList.length),
                            total: dossierList.length,
                          })}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDossierPage((p) => Math.max(1, p - 1))}
                            disabled={dossierPage === 1}
                            className="px-3 py-1.5 bg-bg border border-border rounded-lg text-xs font-semibold hover:text-primary hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                          >
                            <ArrowLeft size={12} weight="bold" />
                            <span>{tWorkspace("previous")}</span>
                          </button>
                          <span className="font-mono text-xs text-primary font-semibold px-2">
                            {tWorkspace("pageOf", { current: dossierPage, total: Math.ceil(dossierList.length / dossierPageSize) })}
                          </span>
                          <button
                            type="button"
                            onClick={() => setDossierPage((p) => Math.min(Math.ceil(dossierList.length / dossierPageSize), p + 1))}
                            disabled={dossierPage === Math.ceil(dossierList.length / dossierPageSize)}
                            className="px-3 py-1.5 bg-bg border border-border rounded-lg text-xs font-semibold hover:text-primary hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                          >
                            <span>{tWorkspace("next")}</span>
                            <ArrowRight size={12} weight="bold" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-10 px-4 text-center border-2 border-dashed border-border rounded-xl bg-bg/50 space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-full bg-surface-raised flex items-center justify-center text-secondary">
                      <Globe size={24} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-primary">{tWorkspace("noDossierCreated")}</p>
                      <p className="text-xs text-secondary max-w-sm mx-auto">
                        {tWorkspace("noDossierCreatedDesc")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <span className="text-xs font-bold text-accent flex items-center gap-1.5">
                    <Globe size={16} />
                    {tWorkspace("dossierConfigTargetCountry")}
                  </span>
                </div>

                {/* Form Grid (5 columns x 1 row) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {renderSelectInput(
                    tWorkspace("formSubmissionCountry"),
                    configState.submissionCountry,
                    (val) => setConfigState({ ...configState, submissionCountry: val }),
                    [
                      { label: "UNITED ARAB EMIRATES (AE)", value: "UNITED ARAB EMIRATES (AE)" },
                    ],
                    isDossierSaved,
                    isSection2Disabled,
                    true
                  )}

                  {renderSelectInput(
                    tWorkspace("formKindProcedure"),
                    configState.procedureType,
                    (val) => setConfigState({ ...configState, procedureType: val }),
                    [
                      { label: "National Procedure", value: "National Procedure" },
                      { label: "GCC Centralized", value: "GCC Centralized" },
                    ],
                    isDossierSaved,
                    isSection2Disabled,
                    true
                  )}

                  {renderSelectInput(
                    tWorkspace("formTypeProcedure"),
                    configState.typeOfProcedure,
                    (val) => setConfigState({ ...configState, typeOfProcedure: val }),
                    [
                      { label: "New Marketing Authorization (MAA)", value: "New Marketing Authorization (MAA)" },
                      { label: "Variation", value: "Variation" },
                      { label: "Renewal", value: "Renewal" },
                      { label: "Response", value: "Response" },
                    ],
                    isDossierSaved,
                    isSection2Disabled
                  )}

                  {renderTextInput(
                    tWorkspace("formApplicationNumber"),
                    configState.applicationNumber,
                    (val) => setConfigState({ ...configState, applicationNumber: val }),
                    isDossierSaved,
                    isSection2Disabled
                  )}

                  {renderSelectInput(
                    tWorkspace("formDossierSequence"),
                    configState.dossierSequence,
                    (val) => setConfigState({ ...configState, dossierSequence: val }),
                    [
                      { label: "Sequence 0000", value: "Sequence 0000" },
                      { label: "Sequence 0001", value: "Sequence 0001" },
                      { label: "Sequence 0002", value: "Sequence 0002" },
                      { label: "Sequence 0003", value: "Sequence 0003" },
                      { label: "Sequence 0004", value: "Sequence 0004" },
                      { label: "Sequence 0005", value: "Sequence 0005" },
                    ],
                    isDossierSaved,
                    isSection2Disabled
                  )}
                </div>

                {/* Card 2 Footer Action */}
                <div className="flex justify-end items-center gap-3 pt-2 border-t border-border">
                  {!isProjectSaved ? (
                    <button
                      disabled
                      type="button"
                      title="Save Project Data first to activate Dossier Data Configuration"
                      className="px-3.5 py-1.5 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-700/50 cursor-not-allowed opacity-60"
                    >
                      <LockKey size={15} weight="bold" />
                      <span>{tWorkspace("btnSaveSection1First")}</span>
                    </button>
                  ) : isDossierSaved ? (
                    <div className="flex items-center gap-3">
                      {isEditingDossier && editingDossierId !== null && (
                        <button
                          onClick={handleCancelCard2}
                          type="button"
                          className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white border border-red-500/40 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
                        >
                          <X size={15} weight="bold" />
                          <span>{tWorkspace("cancelBtn")}</span>
                        </button>
                      )}
                      <button
                        onClick={handleEditCard2}
                        disabled={isSavingDossier}
                        type="button"
                        className={`px-3.5 py-1.5 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 border ${isEditingDossier ? "bg-[#3178c6] hover:bg-[#2766ab] border-[#3178c6]/40" : "bg-amber-600 hover:bg-amber-500 border-amber-400/40"}`}
                      >
                        {isSavingDossier ? (
                          <CircleNotch size={15} className="animate-spin" />
                        ) : isEditingDossier ? (
                          <FloppyDiskBack size={15} weight="fill" />
                        ) : (
                          <PencilSimple size={15} weight="bold" />
                        )}
                        <span>
                          {isSavingDossier
                            ? tWorkspace("updating")
                            : isEditingDossier
                              ? tCommon("save")
                              : tWorkspace("btnEditSection2")}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleSaveCard2}
                      disabled={isSavingDossier}
                      type="button"
                      className="px-3.5 py-1.5 bg-[#3178c6] hover:bg-[#2766ab] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 border border-[#3178c6]/40"
                    >
                      {isSavingDossier ? (
                        <CircleNotch size={15} className="animate-spin" />
                      ) : (
                        <FloppyDiskBack size={15} weight="fill" />
                      )}
                      <span>{isSavingDossier ? tWorkspace("saving") : tCommon("save")}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingDossierId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-500">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <Trash size={22} />
              </div>
              <div>
                <h3 className="font-lexend font-bold text-base text-primary">{tWorkspace("deleteDossierConfigTitle")}</h3>
                <span className="font-mono text-xs text-red-400 font-semibold">{deletingDossierId}</span>
              </div>
            </div>

            <p className="text-xs text-secondary leading-relaxed">
              {tWorkspace("deleteDossierConfigMsg")}
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                disabled={isDeletingDossier}
                onClick={() => setDeletingDossierId(null)}
                className="px-4 py-2 bg-bg hover:bg-surface-raised border border-border text-secondary font-semibold rounded-lg cursor-pointer disabled:opacity-50 text-xs"
              >
                {tWorkspace("cancelBtn")}
              </button>
              <button
                type="button"
                disabled={isDeletingDossier}
                onClick={() => handleDeleteDossier(deletingDossierId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all shadow-sm cursor-pointer flex items-center gap-2 disabled:opacity-50 text-xs"
              >
                {isDeletingDossier && <CircleNotch size={16} className="animate-spin" />}
                <span>{isDeletingDossier ? tWorkspace("deleting") : tWorkspace("confirmDelete")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
