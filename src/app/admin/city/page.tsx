"use client";

import { ApiCall } from "@/services/api";
import { encryptURLData } from "@/utils/methods";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Input, Pagination } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import Switch from "react-switch";

const City = () => {
  const router = useRouter();
  const [pagination, setPaginatin] = useState<{
    take: number;
    skip: number;
    total: number;
  }>({
    take: 10,
    skip: 0,
    total: 0,
  });

  const [search, setSearch] = useState<string>("");

  interface SearchCityResponse {
    limit: number;
    page: number;
    total: number;
    data: {
      id: number;
      name: string;
      status: string;
    }[];
  }

  interface UpdateCityResponse {
    id: number;
  }

  const citydata = useQuery({
    queryKey: ["cities", pagination.skip, pagination.take, search],
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await ApiCall({
        query:
          "query GetPaginatedCity($searchPaginationInput: SearchPaginationInput!, $whereSearchInput: WhereCitySearchInput!) {getPaginatedCity(searchPaginationInput: $searchPaginationInput, whereSearchInput: $whereSearchInput) {data {id,name,status}, total, skip, take}}",
        variables: {
          searchPaginationInput: {
            take: pagination.take,
            skip: pagination.skip,
            search: search,
          },
          whereSearchInput: {},
        },
      });

      if (!response.status) {
        throw new Error(response.message);
      }

      // if value is not in response.data then return the error
      if (!(response.data as Record<string, unknown>)["getPaginatedCity"]) {
        throw new Error("Value not found in response");
      }
      return (response.data as Record<string, unknown>)[
        "getPaginatedCity"
      ] as SearchCityResponse;
    },
  });

  const onChange = (page: number, pagesize: number) => {
    setPaginatin({
      ...pagination,
      skip: pagesize * (page - 1),
      take: pagesize,
    });
    citydata.refetch();
  };

  const updatecity = useMutation({
    mutationKey: ["updatecity"],
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await ApiCall({
        query:
          "mutation UpdateCity($updateCityId: Int!, $updateType: UpdateCityInput!) { updateCity(id: $updateCityId, updateType: $updateType) {id}}",
        variables: {
          updateCityId: id,
          updateType: {
            status: status,
          },
        },
      });

      if (!response.status) {
        throw new Error(response.message);
      }

      // if value is not in response.data then return the error
      if (!(response.data as Record<string, unknown>)["updateCity"]) {
        throw new Error("Value not found in response");
      }
      return (response.data as Record<string, unknown>)[
        "updateCity"
      ] as UpdateCityResponse;
    },
    onSuccess: () => {
      citydata.refetch();
      toast.success("City updated successfully");
    },
  });

  return (
    <div className="p-6">
      <div className="flex gap-2 items-center">
        <h1 className="text-[#162f57] text-2xl font-semibold">Cities</h1>
        <div className="grow"></div>
        <Input
          placeholder="search"
          style={{ width: 200 }}
          value={search}
          allowClear
          onChange={(e) => {
            setPaginatin({
              ...pagination,
              skip: 0,
              take: pagination.take,
            });
            setSearch(e.target.value);
            citydata.refetch();
          }}
        />
      </div>

      <div className="mt-2 p-4 bg-white rounded-md shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full mt-2 border-collapse border border-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 px-4 py-2 text-left text-md font-normal">
                  Id
                </th>
                <th className="border border-gray-300 px-4 py-2 text-left text-md font-normal">
                  Name
                </th>
                <th className="border border-gray-300 px-4 py-2 text-left text-md font-normal">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {citydata.data?.data.map((city, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2 font-normal text-sm">
                    {index + 1 + pagination.skip}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 font-normal text-sm">
                    {city.name}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 font-normal text-sm">
                    <Switch
                      onChange={(checked) => {
                        updatecity.mutate({
                          id: city.id,
                          status: checked ? "ACTIVE" : "INACTIVE",
                        });
                      }}
                      checked={city.status == "ACTIVE"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4"></div>
        <div className="mx-auto 500 grid place-items-center">
          <div className="lg:hidden">
            <Pagination
              align="center"
              defaultCurrent={1}
              onChange={onChange}
              showSizeChanger
              total={500}
            />
          </div>
          <div className="hidden lg:block">
            <Pagination
              className="mt-2 mx-auto"
              showTotal={(total, range) =>
                `${range[0]}-${range[1]} of ${total} items`
              }
              showQuickJumper
              defaultCurrent={1}
              total={citydata.data?.data.length ? citydata.data?.total : 0}
              pageSizeOptions={[2, 5, 10, 20, 25, 50, 100]}
              onChange={onChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default City;
