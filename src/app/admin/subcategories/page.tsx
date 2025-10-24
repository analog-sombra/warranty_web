"use client";

import React, { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  createColumnHelper,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  PaginationState,
} from "@tanstack/react-table";
import { Input, Button, Select, Typography, Dropdown, Modal} from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiCall } from "@/services/api";
import { getCookie } from "cookies-next";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

// Try importing icons differently
let SearchOutlined: any, ReloadOutlined: any, MoreOutlined: any, EditOutlined: any, DeleteOutlined: any;
try {
  const icons = require("@ant-design/icons");
  SearchOutlined = icons.SearchOutlined;
  ReloadOutlined = icons.ReloadOutlined;
  MoreOutlined = icons.MoreOutlined;
  EditOutlined = icons.EditOutlined;
  DeleteOutlined = icons.DeleteOutlined;
} catch (e) {
  // Fallback if icons don't load
  SearchOutlined = () => "🔍";
  ReloadOutlined = () => "🔄";
  MoreOutlined = () => "⋯";
  EditOutlined = () => "✏️";
  DeleteOutlined = () => "🗑️";
}

const { Title } = Typography;
const { Option } = Select;

// Types for the subcategory data
interface Subcategory {
  id: number;
  name: string;
  priority: number;
  status: "ACTIVE" | "INACTIVE";
  product_category: {
    id: number;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface GetPaginatedSubcategoryResponse {
  getPaginatedProductSubcategory: {
    skip: number;
    take: number;
    total: number;
    data: Subcategory[];
  };
}

interface SearchPaginationInput {
  skip: number;
  take: number;
  search?: string;
}

interface UpdateSubcategoryInput {
  status: "ACTIVE" | "INACTIVE";
  updatedById: number;
}

// GraphQL queries
const GET_PAGINATED_SUBCATEGORY = `
  query GetPaginatedProductSubcategory($searchPaginationInput: SearchPaginationInput!, $whereSearchInput: WhereProductSubcategorySearchInput!) {
    getPaginatedProductSubcategory(searchPaginationInput: $searchPaginationInput, whereSearchInput: $whereSearchInput) {
      skip
      take
      total
      data {
        id
        name
        priority
        status
        product_category {
          id
          name
        }
        createdAt
        updatedAt
      }
    }
  }
`;

const DELETE_SUBCATEGORY = `
  mutation DeleteProductSubcategory($deleteSubcategoryId: Int!, $userid: Int!) {
    deleteProductSubcategory(id: $deleteSubcategoryId, userid: $userid) {
      id  
    }
  }
`;

const UPDATE_SUBCATEGORY_STATUS = `
  mutation UpdateProductSubcategory($updateSubcategoryId: Int!, $updateType: UpdateProductSubcategoryInput!) {
    updateProductSubcategory(id: $updateSubcategoryId, updateType: $updateType) {
      id  
    }
  }
`;

const CREATE_PRODUCT_SUBCATEGORY = `
  mutation CreateProductSubcategory($inputType: CreateProductSubcategoryInput!) {
    createProductSubcategory(inputType: $inputType) {
      id  
    }
  }
`;

const GET_ALL_PRODUCT_CATEGORY = `
  query GetAllProductCategory {
    getAllProductCategory {
      id,
      name  
    }
  }
`;

// API functions
const fetchSubcategories = async (input: SearchPaginationInput): Promise<{
  skip: number;
  take: number;
  total: number;
  data: Subcategory[];
}> => {
  const response = await ApiCall<GetPaginatedSubcategoryResponse>({
    query: GET_PAGINATED_SUBCATEGORY,
    variables: {
      searchPaginationInput: input,
      whereSearchInput: {},
    },
  });

  if (!response.status) {
    throw new Error(response.message);
  }

  return response.data.getPaginatedProductSubcategory;
};

const deleteSubcategoryApi = async (subcategoryId: number, userId: number): Promise<{ id: number }> => {
  const response = await ApiCall<{ deleteProductSubcategory: { id: number } }>({
    query: DELETE_SUBCATEGORY,
    variables: {
      deleteSubcategoryId: subcategoryId,
      userid: userId,
    },
  });

  if (!response.status) {
    throw new Error(response.message);
  }

  return response.data.deleteProductSubcategory;
};

const updateSubcategoryStatusApi = async (
  subcategoryId: number,
  status: "ACTIVE" | "INACTIVE",
  updatedById: number
): Promise<{ id: number }> => {
  const response = await ApiCall<{ updateProductSubcategory: { id: number } }>({
    query: UPDATE_SUBCATEGORY_STATUS,
    variables: {
      updateSubcategoryId: subcategoryId,
      updateType: {
        status,
        updatedById,
      },
    },
  });

  if (!response.status) {
    throw new Error(response.message);
  }

  return response.data.updateProductSubcategory;
};

const createSubcategoryApi = async (
  name: string,
  productCategoryId: number,
  createdById: number
): Promise<{ id: number }> => {
  const response = await ApiCall<{ createProductSubcategory: { id: number } }>({
    query: CREATE_PRODUCT_SUBCATEGORY,
    variables: {
      inputType: {
        name,
        product_category_id: productCategoryId,
        createdById,
        priority: 1,
      },
    },
  });

  if (!response.status) {
    throw new Error(response.message);
  }

  return response.data.createProductSubcategory;
};

const fetchCategoriesApi = async (): Promise<{ id: number; name: string }[]> => {
  const response = await ApiCall<{ getAllProductCategory: { id: number; name: string }[] }>({
    query: GET_ALL_PRODUCT_CATEGORY,
    variables: {},
  });

  if (!response.status) {
    throw new Error(response.message);
  }

  return response.data.getAllProductCategory;
};

const SubcategoriesPage = () => {
  // Router for navigation
  const router = useRouter();

  // State management
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [subcategoryToDelete, setSubcategoryToDelete] = useState<Subcategory | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [subcategoryToUpdateStatus, setSubcategoryToUpdateStatus] = useState<Subcategory | null>(null);
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
  const [subcategoryName, setSubcategoryName] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);

  // Query client for invalidating queries
  const queryClient = useQueryClient();

  // Prepare search input for API
  const searchInput: SearchPaginationInput = {
    skip: pagination.pageIndex * pagination.pageSize,
    take: pagination.pageSize,
    ...(globalFilter && { search: globalFilter }),
  };

  // Fetch data using React Query
  const {
    data: subcategoriesData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["subcategories", searchInput],
    queryFn: () => fetchSubcategories(searchInput),
    placeholderData: (previousData) => previousData,
  });

  // Fetch categories for subcategory dropdown
  const {
    data: categories,
    isLoading: isCategoriesLoading,
    isError: isCategoriesError,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategoriesApi,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: ({ subcategoryId, userId }: { subcategoryId: number; userId: number }) =>
      deleteSubcategoryApi(subcategoryId, userId),
    onSuccess: (data, variables) => {
      toast.success(`Subcategory deleted successfully`);
      // Invalidate and refetch subcategories data
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete subcategory: ${error.message}`);
    },
  });

  // Status update mutation
  const statusUpdateMutation = useMutation({
    mutationFn: ({
      subcategoryId,
      status,
      updatedById
    }: {
      subcategoryId: number;
      status: "ACTIVE" | "INACTIVE";
      updatedById: number
    }) => updateSubcategoryStatusApi(subcategoryId, status, updatedById),
    onSuccess: (data, variables) => {
      const statusText = variables.status.toLowerCase();
      toast.success(`Subcategory status updated to ${statusText}`);
      // Invalidate and refetch subcategories data
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update subcategory status: ${error.message}`);
    },
  });

  // Create subcategory mutation
  const createSubcategoryMutation = useMutation({
    mutationFn: ({
      name,
      productCategoryId,
      createdById,
    }: {
      name: string;
      productCategoryId: number;
      createdById: number;
    }) => createSubcategoryApi(name, productCategoryId, createdById),
    onSuccess: (data) => {
      toast.success(`Subcategory "${subcategoryName}" created successfully!`);
      setIsSubcategoryModalOpen(false);
      setSubcategoryName("");
      setSelectedCategoryId(undefined);
      // Invalidate and refetch subcategories data
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to create subcategory: ${error.message}`);
    },
  });

  // Create column helper
  const columnHelper = createColumnHelper<Subcategory>();

  // Define columns
  const columns = useMemo<ColumnDef<Subcategory, any>[]>(
    () => [
      columnHelper.accessor("id", {
        header: "ID",
        cell: (info) => info.getValue(),
        size: 80,
      }),
      columnHelper.accessor("name", {
        header: "Subcategory Name",
        cell: (info) => (
          <div className="flex items-center">
            <div className="flex-shrink-0 h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
              <span className="text-purple-600 font-semibold text-xs">
                {info.getValue().charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="font-semibold text-gray-900">{info.getValue()}</div>
              <div className="text-xs text-gray-500">ID: {info.row.original.id}</div>
            </div>
          </div>
        ),
        size: 200,
      }),
      columnHelper.accessor("product_category.name", {
        header: "Parent Category",
        cell: (info) => (
          <div>
            <div className="font-medium text-gray-900">{info.getValue()}</div>
            <div className="text-xs text-gray-500">ID: {info.row.original.product_category.id}</div>
          </div>
        ),
        size: 150,
      }),
      columnHelper.accessor("priority", {
        header: "Priority",
        cell: (info) => (
          <div className="flex items-center">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              #{info.getValue()}
            </span>
          </div>
        ),
        size: 120,
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => {
          const status = info.getValue();
          const subcategory = info.row.original;
          const isUpdating = statusUpdateMutation.isPending;

          return (
            <div className="flex items-center gap-2">
              <div className={`flex items-center px-3 py-1 rounded-full text-xs font-semibold ${status === "ACTIVE"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
                }`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${status === "ACTIVE" ? "bg-green-400" : "bg-red-400"
                  }`}></div>
                {status}
              </div>
              <Button
                type="text"
                size="small"
                loading={isUpdating}
                onClick={() => handleStatusToggle(subcategory)}
                className={`hover:scale-105 transition-transform duration-200 ${status === "ACTIVE"
                    ? "text-red-600 hover:bg-red-50"
                    : "text-green-600 hover:bg-green-50"
                  }`}
                title={`Click to ${status === "ACTIVE" ? "deactivate" : "activate"} subcategory`}
              >
                {status === "ACTIVE" ? "📴" : "✅"}
              </Button>
            </div>
          );
        },
        size: 160,
        filterFn: "equals",
      }),
      columnHelper.accessor("createdAt", {
        header: "Created",
        cell: (info) => (
          <div className="text-sm text-gray-600">
            {new Date(info.getValue()).toLocaleDateString()}
          </div>
        ),
        size: 120,
      }),
      // Actions column
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const subcategory = row.original;
          return (
            <div className="flex items-center justify-center">
              <Dropdown
                menu={{
                  items: getActionMenuItems(subcategory),
                }}
                trigger={['click']}
                placement="bottomRight"
              >
                <Button
                  type="text"
                  icon={<MoreOutlined />}
                  size="small"
                  className="hover:bg-purple-50 hover:text-purple-600 rounded-full h-8 w-8 flex items-center justify-center transition-all duration-200"
                />
              </Dropdown>
            </div>
          );
        },
        size: 100,
        enableSorting: false,
      },
    ],
    [columnHelper]
  );

  // Filter data based on status filter
  const filteredData = useMemo(() => {
    if (!subcategoriesData?.data) return [];

    let filtered = [...subcategoriesData.data];

    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter((subcategory) => subcategory.status === statusFilter);
    }

    return filtered;
  }, [subcategoriesData, statusFilter]);

  // Create table instance
  const table = useReactTable({
    data: filteredData,
    columns,
    pageCount: subcategoriesData ? Math.ceil(subcategoriesData.total / pagination.pageSize) : -1,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    debugTable: true,
  });

  // Handle search
  const handleSearch = (value: string) => {
    setGlobalFilter(value);
    setPagination({ ...pagination, pageIndex: 0 }); // Reset to first page
  };

  // Handle status filter
  const handleStatusFilter = (value: string) => {
    setStatusFilter(value === "all" ? undefined : value);
  };

  // Handle refresh
  const handleRefresh = () => {
    refetch();
  };

  // Handle edit action
  const handleEdit = (subcategory: Subcategory) => {
    router.push(`/admin/subcategories/${subcategory.id}`);
  };

  // Handle delete action
  const handleDelete = (subcategory: Subcategory) => {
    const userId = getCookie("id");

    if (!userId) {
      toast.error("User not authenticated. Please login again.");
      return;
    }

    setSubcategoryToDelete(subcategory);
    setIsDeleteModalOpen(true);
  };

  // Handle confirm delete
  const handleConfirmDelete = () => {
    if (!subcategoryToDelete) return;

    const userId = getCookie("id");
    if (!userId) {
      toast.error("User not authenticated. Please login again.");
      return;
    }

    deleteMutation.mutate(
      {
        subcategoryId: subcategoryToDelete.id,
        userId: parseInt(userId.toString()),
      },
      {
        onSuccess: () => {
          setIsDeleteModalOpen(false);
          setSubcategoryToDelete(null);
        },
        onError: () => {
          // Keep modal open on error so user can retry
        },
      }
    );
  };

  // Handle cancel delete
  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
    setSubcategoryToDelete(null);
  };

  // Handle status toggle
  const handleStatusToggle = (subcategory: Subcategory) => {
    const userId = getCookie("id");

    if (!userId) {
      toast.error("User not authenticated. Please login again.");
      return;
    }

    setSubcategoryToUpdateStatus(subcategory);
    setIsStatusModalOpen(true);
  };

  // Handle confirm status update
  const handleConfirmStatusUpdate = () => {
    if (!subcategoryToUpdateStatus) return;

    const userId = getCookie("id");
    if (!userId) {
      toast.error("User not authenticated. Please login again.");
      return;
    }

    const newStatus = subcategoryToUpdateStatus.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    statusUpdateMutation.mutate(
      {
        subcategoryId: subcategoryToUpdateStatus.id,
        status: newStatus,
        updatedById: parseInt(userId.toString()),
      },
      {
        onSuccess: () => {
          setIsStatusModalOpen(false);
          setSubcategoryToUpdateStatus(null);
        },
        onError: () => {
          // Keep modal open on error so user can retry
        },
      }
    );
  };

  // Handle cancel status update
  const handleCancelStatusUpdate = () => {
    setIsStatusModalOpen(false);
    setSubcategoryToUpdateStatus(null);
  };

  // Handle add subcategory modal
  const handleAddSubcategory = () => {
    setIsSubcategoryModalOpen(true);
  };

  // Handle subcategory creation
  const handleCreateSubcategory = () => {
    const userId = getCookie("id");

    if (!userId) {
      toast.error("User not authenticated. Please login again.");
      return;
    }

    if (!subcategoryName.trim()) {
      toast.error("Please enter a subcategory name.");
      return;
    }

    if (!selectedCategoryId) {
      toast.error("Please select a parent category.");
      return;
    }

    createSubcategoryMutation.mutate({
      name: subcategoryName.trim(),
      productCategoryId: selectedCategoryId,
      createdById: parseInt(userId.toString()),
    });
  };

  // Handle cancel subcategory creation
  const handleCancelSubcategory = () => {
    setIsSubcategoryModalOpen(false);
    setSubcategoryName("");
    setSelectedCategoryId(undefined);
  };

  // Get action menu items for each row
  const getActionMenuItems = (subcategory: Subcategory) => [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Edit',
      onClick: () => handleEdit(subcategory),
    },
    {
      key: 'delete',
      icon: deleteMutation.isPending ? <span className="animate-spin">⏳</span> : <DeleteOutlined />,
      label: deleteMutation.isPending ? 'Deleting...' : 'Delete',
      danger: true,
      disabled: deleteMutation.isPending,
      onClick: () => handleDelete(subcategory),
    },
  ];

  if (isError) {
    return (
      <div className="p-6">
        <div>
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">
              Error: {error instanceof Error ? error.message : "Unknown error"}
            </p>
            <Button onClick={handleRefresh} type="primary">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Add Subcategory Modal */}
      <Modal
        title={
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600 text-lg">📂</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">Create New Subcategory</span>
          </div>
        }
        open={isSubcategoryModalOpen}
        onCancel={handleCancelSubcategory}
        footer={null}
        width={500}
        centered
      >
        <div className="py-4">
          <div className="mb-6">
            <p className="text-gray-700 mb-4">
              Create a new subcategory under an existing category:
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parent Category <span className="text-red-500">*</span>
                </label>
                <Select
                  size="large"
                  placeholder="Select parent category"
                  value={selectedCategoryId}
                  onChange={setSelectedCategoryId}
                  disabled={createSubcategoryMutation.isPending || isCategoriesLoading}
                  loading={isCategoriesLoading}
                  className="w-full"
                  options={categories?.map((category) => ({
                    value: category.id,
                    label: category.name,
                  }))}
                />
                {isCategoriesError && (
                  <p className="text-red-500 text-xs mt-1">
                    Failed to load categories. Please try again.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subcategory Name <span className="text-red-500">*</span>
                </label>
                <Input
                  size="large"
                  placeholder="Enter subcategory name (e.g., Smartphones, Laptops)"
                  value={subcategoryName}
                  onChange={(e) => setSubcategoryName(e.target.value)}
                  onPressEnter={handleCreateSubcategory}
                  disabled={createSubcategoryMutation.isPending}
                />
              </div>
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-start gap-2">
                  <span className="text-purple-500 text-lg">ℹ️</span>
                  <div>
                    <p className="text-purple-800 font-medium text-sm">Subcategory Settings</p>
                    <p className="text-purple-700 text-sm mt-1">
                      This subcategory will be created with <strong>Priority 1</strong> under the selected parent category and will be immediately available for product assignment.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              size="large"
              onClick={handleCancelSubcategory}
              disabled={createSubcategoryMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              size="large"
              loading={createSubcategoryMutation.isPending}
              onClick={handleCreateSubcategory}
              className="bg-purple-600 hover:bg-purple-700 border-purple-600 hover:border-purple-700"
              icon={createSubcategoryMutation.isPending ? null : "📂"}
            >
              {createSubcategoryMutation.isPending ? "Creating..." : "Create Subcategory"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        title={
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <DeleteOutlined className="text-red-600 text-lg" />
            </div>
            <span className="text-lg font-semibold text-gray-900">Delete Subcategory</span>
          </div>
        }
        open={isDeleteModalOpen}
        onCancel={handleCancelDelete}
        footer={null}
        width={500}
        centered
      >
        {subcategoryToDelete && (
          <div className="py-4">
            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                Are you sure you want to delete the subcategory:
              </p>
              <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-red-400">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 font-semibold text-sm">
                      {subcategoryToDelete.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{subcategoryToDelete.name}</h4>
                    <p className="text-sm text-gray-500">
                      ID: {subcategoryToDelete.id} • Category: {subcategoryToDelete.product_category.name}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-start gap-2">
                  <span className="text-red-500 text-lg">⚠️</span>
                  <div>
                    <p className="text-red-800 font-medium text-sm">Warning</p>
                    <p className="text-red-700 text-sm">
                      This action cannot be undone. All products associated with this subcategory may be affected.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                size="large"
                onClick={handleCancelDelete}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                danger
                size="large"
                loading={deleteMutation.isPending}
                onClick={handleConfirmDelete}
                icon={deleteMutation.isPending ? null : <DeleteOutlined />}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete Subcategory"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Status Update Confirmation Modal */}
      <Modal
        title={
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${subcategoryToUpdateStatus?.status === "ACTIVE"
                ? "bg-red-100"
                : "bg-green-100"
              }`}>
              <span className="text-lg">
                {subcategoryToUpdateStatus?.status === "ACTIVE" ? "📴" : "✅"}
              </span>
            </div>
            <span className="text-lg font-semibold text-gray-900">
              {subcategoryToUpdateStatus?.status === "ACTIVE" ? "Deactivate" : "Activate"} Subcategory
            </span>
          </div>
        }
        open={isStatusModalOpen}
        onCancel={handleCancelStatusUpdate}
        footer={null}
        width={500}
        centered
      >
        {subcategoryToUpdateStatus && (
          <div className="py-4">
            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                Are you sure you want to{" "}
                <strong>
                  {subcategoryToUpdateStatus.status === "ACTIVE" ? "deactivate" : "activate"}
                </strong>{" "}
                the subcategory:
              </p>
              <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-purple-400">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-semibold text-sm">
                      {subcategoryToUpdateStatus.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{subcategoryToUpdateStatus.name}</h4>
                    <p className="text-sm text-gray-500">
                      ID: {subcategoryToUpdateStatus.id} • Category: {subcategoryToUpdateStatus.product_category.name}
                    </p>
                  </div>
                </div>
              </div>
              <div className={`mt-4 p-3 rounded-lg border ${subcategoryToUpdateStatus.status === "ACTIVE"
                  ? "bg-red-50 border-red-200"
                  : "bg-green-50 border-green-200"
                }`}>
                <div className="flex items-start gap-2">
                  <span className="text-lg">
                    {subcategoryToUpdateStatus.status === "ACTIVE" ? "⚠️" : "ℹ️"}
                  </span>
                  <div>
                    <p className={`font-medium text-sm ${subcategoryToUpdateStatus.status === "ACTIVE"
                        ? "text-red-800"
                        : "text-green-800"
                      }`}>
                      Status Change
                    </p>
                    <p className={`text-sm ${subcategoryToUpdateStatus.status === "ACTIVE"
                        ? "text-red-700"
                        : "text-green-700"
                      }`}>
                      This will change the subcategory status from{" "}
                      <strong>{subcategoryToUpdateStatus.status}</strong> to{" "}
                      <strong>
                        {subcategoryToUpdateStatus.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"}
                      </strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                size="large"
                onClick={handleCancelStatusUpdate}
                disabled={statusUpdateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                size="large"
                loading={statusUpdateMutation.isPending}
                onClick={handleConfirmStatusUpdate}
                className={
                  subcategoryToUpdateStatus.status === "ACTIVE"
                    ? "bg-red-600 hover:bg-red-700 border-red-600 hover:border-red-700"
                    : "bg-green-600 hover:bg-green-700 border-green-600 hover:border-green-700"
                }
                icon={statusUpdateMutation.isPending ? null : (
                  subcategoryToUpdateStatus.status === "ACTIVE" ? "📴" : "✅"
                )}
              >
                {statusUpdateMutation.isPending
                  ? "Updating..."
                  : `${subcategoryToUpdateStatus.status === "ACTIVE" ? "Deactivate" : "Activate"} Subcategory`
                }
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div>
                <Title level={3} className="!mb-0 text-gray-900">
                  Subcategories
                </Title>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="primary"
                onClick={handleAddSubcategory}
                className="bg-purple-600 hover:bg-purple-700 border-purple-600 hover:border-purple-700"
              >
                Add Subcategory
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search subcategories..."
                prefix={<SearchOutlined />}
                value={globalFilter ?? ""}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-64"
                size="large"
                allowClear
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Status:</span>
              <Select
                placeholder="All"
                className="w-32"
                size="large"
                value={statusFilter}
                onChange={handleStatusFilter}
                allowClear
              >
                <Option value="all">All</Option>
                <Option value="ACTIVE">Active</Option>
                <Option value="INACTIVE">Inactive</Option>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Show:</span>
              <Select
                value={pagination.pageSize}
                onChange={(value) => {
                  setPagination({ ...pagination, pageSize: value, pageIndex: 0 });
                }}
                className="w-20"
                size="large"
              >
                <Option value={5}>5</Option>
                <Option value={10}>10</Option>
                <Option value={20}>20</Option>
                <Option value={50}>50</Option>
              </Select>
            </div>

            <div className="ml-auto">
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={isLoading}
                size="large"
                className="hover:bg-gray-50"
              >
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {isLoading && (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-gray-600">Loading subcategories...</span>
            </div>
          )}
          {!isLoading && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="bg-gray-50 border-b border-gray-200">
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="text-left px-6 py-4 font-semibold text-gray-900 text-sm uppercase tracking-wider"
                          style={{ width: header.getSize() }}
                        >
                          {header.isPlaceholder ? null : (
                            <div
                              {...{
                                className: header.column.getCanSort()
                                  ? "cursor-pointer select-none hover:text-purple-600 transition-colors duration-200 flex items-center gap-2"
                                  : "flex items-center gap-2",
                                onClick: header.column.getToggleSortingHandler(),
                              }}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              <span className="text-xs">
                                {{
                                  asc: "↑",
                                  desc: "↓",
                                }[header.column.getIsSorted() as string] ?? "↕"}
                              </span>
                            </div>
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {table.getRowModel().rows.map((row, index) => (
                    <tr
                      key={row.id}
                      className={`transition-colors duration-200 hover:bg-purple-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredData.length === 0 && !isLoading && (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📂</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No subcategories found</h3>
                  <p className="text-gray-500">Try adjusting your search or filter criteria</p>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{pagination.pageIndex * pagination.pageSize + 1}</span> to{" "}
              <span className="font-medium">
                {Math.min(
                  (pagination.pageIndex + 1) * pagination.pageSize,
                  subcategoriesData?.total || 0
                )}
              </span>{" "}
              of <span className="font-medium">{subcategoriesData?.total || 0}</span> subcategories
            </div>

            <div className="flex items-center space-x-2">
              <Button
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                size="small"
                className="hover:bg-white"
              >
                First
              </Button>
              <Button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                size="small"
                className="hover:bg-white"
              >
                Previous
              </Button>

              <span className="flex items-center gap-2 px-3 py-1 bg-white rounded border">
                <span className="text-sm">Page</span>
                <span className="font-semibold text-purple-600">
                  {table.getState().pagination.pageIndex + 1}
                </span>
                <span className="text-sm">of</span>
                <span className="font-semibold">
                  {table.getPageCount()}
                </span>
              </span>

              <Button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                size="small"
                className="hover:bg-white"
              >
                Next
              </Button>
              <Button
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                size="small"
                className="hover:bg-white"
              >
                Last
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubcategoriesPage;