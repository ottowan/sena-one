import React, { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Heading,
  Text,
  Card,
  VStack,
  HStack,
  Icon,
  Badge,
  Button,
} from "@chakra-ui/react";
import {
  LuWallet,
  LuHouse,
  LuDroplet,
  LuUsers,
  LuCarFront,
} from "react-icons/lu";
import { useAuth } from "../../contexts/AuthContext";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { formatCurrency, formatDate } from "../../lib/utils";
import { useRentRates, useAppSettings } from "../../hooks/useSettings";
import {
  VEHICLE_TYPE_ICONS,
  VEHICLE_TYPE_LABELS,
} from "../../components/vehicles/vehicleMeta";
import {
  getExpiryHighlight,
  formatRemainingDuration,
} from "../../components/contracts/ContractTable";
import { MonthlyLineChart } from "../../components/tenant/MonthlyLineChart";
import type { VehicleRegistration } from "../../types";

const MONTH_LABELS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

const CONTRACT_STATUS_LABELS: Record<string, string> = {
  active: "ใช้งานอยู่",
  expired: "หมดอายุ",
  terminated: "ยกเลิก",
  renewed: "ต่อสัญญาแล้ว",
};

const CONTRACT_STATUS_COLORS: Record<string, string> = {
  active: "green",
  expired: "red",
  terminated: "gray",
  renewed: "blue",
};

export const TenantDashboardPage: React.FC = () => {
  const { profile } = useAuth();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [contract, setContract] = useState<any>(null);
  const [unpaidInvoices, setUnpaidInvoices] = useState<any[]>([]);
  const [yearlyInvoices, setYearlyInvoices] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRegistration[]>([]);
  const [chartTab, setChartTab] = useState<"due" | "water">("due");
  const [contractLoading, setContractLoading] = useState(true);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const { data: rentRates } = useRentRates();
  const { data: appSettings } = useAppSettings();

  useEffect(() => {
    let cancelled = false;

    const fetchContract = async () => {
      if (!profile?.id) {
        setContractLoading(false);
        return;
      }

      setContractLoading(true);
      try {
        const tenantSnap = await getDocs(
          query(collection(db, "tenants"), where("user_id", "==", profile.id)),
        );
        const tenant = tenantSnap.docs[0]
          ? ({ id: tenantSnap.docs[0].id, ...tenantSnap.docs[0].data() } as any)
          : null;

        if (cancelled) return;
        setTenantId(tenant?.id || null);
        setTenant(tenant);

        if (!tenant) {
          setContract(null);
          return;
        }

        const contractsSnap = await getDocs(
          query(
            collection(db, "contracts"),
            where("tenant_uid", "==", profile.id),
          ),
        );
        const activeContractDoc = contractsSnap.docs.find(
          (d) => d.data().status === "active",
        );
        let contractData = activeContractDoc
          ? ({ id: activeContractDoc.id, ...activeContractDoc.data() } as any)
          : null;

        if (cancelled) return;

        if (contractData?.room_id) {
          const roomSnap = await getDoc(doc(db, "rooms", contractData.room_id));
          if (roomSnap.exists())
            contractData = {
              ...contractData,
              room: { id: roomSnap.id, ...roomSnap.data() },
            };
        }

        setContract(contractData);
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) setContractLoading(false);
      }
    };

    void fetchContract();

    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  useEffect(() => {
    let cancelled = false;

    const fetchInvoices = async () => {
      if (!contract?.id || !profile?.id) {
        setUnpaidInvoices([]);
        setYearlyInvoices([]);
        return;
      }

      setInvoiceLoading(true);
      try {
        const snap = await getDocs(
          query(
            collection(db, "invoices"),
            where("tenant_uid", "==", profile.id),
          ),
        );
        const allRows = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as any)
          .filter((inv) => inv.contract_id === contract.id);

        const pendingRows = allRows
          .filter((inv) => inv.status === "pending")
          .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));

        if (!cancelled) {
          setUnpaidInvoices(pendingRows);
          setYearlyInvoices(allRows);
        }
      } finally {
        if (!cancelled) setInvoiceLoading(false);
      }
    };

    void fetchInvoices();

    return () => {
      cancelled = true;
    };
  }, [contract?.id, profile?.id]);

  useEffect(() => {
    let cancelled = false;

    const fetchVehicles = async () => {
      if (!contract?.room_id) {
        setVehicles([]);
        return;
      }

      const snap = await getDocs(
        query(
          collection(db, "vehicles"),
          where("room_id", "==", contract.room_id),
        ),
      );
      if (!cancelled) {
        setVehicles(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as VehicleRegistration[],
        );
      }
    };

    void fetchVehicles();

    return () => {
      cancelled = true;
    };
  }, [contract?.room_id]);

  const totalDue = unpaidInvoices.reduce(
    (sum, inv) => sum + Number(inv.total_amount || 0),
    0,
  );

  const currentYear = new Date().getFullYear();
  const monthlyStats = MONTH_LABELS.map((label, idx) => {
    const monthStr = `${currentYear}-${String(idx + 1).padStart(2, "0")}`;
    const monthInvoices = yearlyInvoices.filter((inv) =>
      String(inv.billing_month || "").startsWith(monthStr),
    );
    return {
      label,
      due: monthInvoices.reduce(
        (sum, inv) => sum + Number(inv.total_amount || 0),
        0,
      ),
      water: monthInvoices.reduce(
        (sum, inv) => sum + Number(inv.water_usage || 0),
        0,
      ),
    };
  });

  const rentRate = tenant?.position_level
    ? rentRates?.find((r) => r.position_level === tenant.position_level)
    : undefined;
  const displayRent =
    rentRate && rentRate.rent_amount > 0
      ? rentRate.rent_amount
      : contract?.monthly_rent;
  const displayCommonFee =
    rentRate && rentRate.common_fee > 0
      ? rentRate.common_fee
      : appSettings?.common_fee;

  const positionLabel = [
    tenant?.position_title,
    tenant?.position_level ? `ระดับ${tenant.position_level}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const expiryHighlight = contract ? getExpiryHighlight(contract) : undefined;

  return (
    <VStack align="stretch" gap={8} py={4}>
      <Box>
        <Heading size="xl" mb={2}>
          สวัสดี, คุณ{tenant?.full_name || profile?.full_name}
          {positionLabel && (
            <Text as="span" fontSize="lg" fontWeight="normal" color="fg.muted">
              {" "}
              ({positionLabel})
            </Text>
          )}
        </Heading>
        <Text color="fg.muted">ยินดีต้อนรับสู่ระบบจัดการหอพัก Sena-One</Text>
        {contractLoading && (
          <Text color="fg.muted" fontSize="sm" mt={2}>
            กำลังโหลดข้อมูลห้องพัก...
          </Text>
        )}
      </Box>

      {contract && (
        <Grid
          templateColumns={{ base: "1fr", lg: "3fr 2fr" }}
          gap={6}
          alignItems="start"
        >
          <Card.Root>
            <Card.Header>
              <HStack justify="space-between" wrap="wrap" gap={3}>
                <Heading size="lg">แนวโน้มรายปี {currentYear + 543}</Heading>
                <HStack gap={2}>
                  <Button
                    size="sm"
                    variant={chartTab === "due" ? "solid" : "outline"}
                    colorPalette={chartTab === "due" ? "brand" : "gray"}
                    onClick={() => setChartTab("due")}
                  >
                    ยอดที่ต้องชำระ
                  </Button>
                  <Button
                    size="sm"
                    variant={chartTab === "water" ? "solid" : "outline"}
                    colorPalette={chartTab === "water" ? "brand" : "gray"}
                    onClick={() => setChartTab("water")}
                  >
                    ปริมาณการใช้น้ำ
                  </Button>
                </HStack>
              </HStack>
            </Card.Header>
            <Card.Body>
              {chartTab === "due" ? (
                <MonthlyLineChart
                  title="ยอดที่ต้องชำระรายเดือน"
                  unit="บาท"
                  color="#2a78d6"
                  data={monthlyStats.map((m) => ({
                    label: m.label,
                    value: m.due,
                  }))}
                  valueFormatter={(v) => formatCurrency(v)}
                />
              ) : (
                <MonthlyLineChart
                  title="ปริมาณการใช้น้ำรายเดือน"
                  unit="หน่วย"
                  color="#1baf7a"
                  data={monthlyStats.map((m) => ({
                    label: m.label,
                    value: m.water,
                  }))}
                  valueFormatter={(v) => `${v.toLocaleString()} หน่วย`}
                />
              )}
            </Card.Body>
          </Card.Root>

          <VStack align="stretch" gap={6}>
            <Card.Root>
              <Card.Body>
                <HStack align="start" justify="space-between">
                  <VStack align="start" gap={1}>
                    <HStack gap={2}>
                      <Text color="fg.muted" fontSize="sm">
                        ข้อมูลห้องพัก
                      </Text>

                      <Badge colorPalette="blue">
                        {contract?.room?.room_type || "Standard"}
                      </Badge>
                    </HStack>
                    <Heading size="2xl">
                      {contract?.room?.room_number || "-"}
                    </Heading>

                    {vehicles.length === 0 ? (
                      <Text color="fg.muted" fontSize="sm">
                        ยังไม่มีข้อมูลรถของห้องนี้
                      </Text>
                    ) : (
                      <VStack align="stretch" gap={0}>
                        {vehicles.map((vehicle) => {
                          return (
                            <HStack key={vehicle.id} justify="space-between">
                              <HStack gap={3}>
                                <VStack align="start" gap={0}>
                                  <HStack gap={1}>
                                    <Text fontWeight="medium">
                                      {vehicle.plate} {vehicle.province}
                                    </Text>

                                    {vehicle.has_sticker ? (
                                      <Badge colorPalette="green">
                                        มีสติ๊กเกอร์
                                      </Badge>
                                    ) : (
                                      <Badge colorPalette="gray">
                                        ไม่มีสติ๊กเกอร์
                                      </Badge>
                                    )}
                                  </HStack>
                                  <Text fontSize="sm" color="fg.muted">
                                    {VEHICLE_TYPE_LABELS[vehicle.type]}
                                    {vehicle.brand ? ` · ${vehicle.brand}` : ""}
                                    {vehicle.color ? ` (${vehicle.color})` : ""}
                                  </Text>
                                </VStack>
                              </HStack>
                            </HStack>
                          );
                        })}
                      </VStack>
                    )}
                  </VStack>
                  <Box p={3} bg="blue.subtle" borderRadius="lg" color="blue.fg">
                    <Icon fontSize="2xl">
                      <LuHouse />
                    </Icon>
                  </Box>
                </HStack>
              </Card.Body>
            </Card.Root>

            <Card.Root
              bg={expiryHighlight?.bg}
              borderLeftWidth={expiryHighlight ? "4px" : undefined}
              borderLeftColor={expiryHighlight?.border}
            >
              <Card.Body>
                <HStack mb={3} align="start">
                  <Text fontSize="md" fontWeight="bold" color="fg.default">
                    รายละเอียดสัญญา
                  </Text>
                  <Badge
                    colorPalette={
                      expiryHighlight?.badge ||
                      (contract?.status
                        ? CONTRACT_STATUS_COLORS[contract.status] || "gray"
                        : "gray")
                    }
                  >
                    {contract?.status
                      ? CONTRACT_STATUS_LABELS[contract.status] ||
                        contract.status
                      : "-"}
                  </Badge>
                </HStack>
                <VStack align="stretch" gap={3}>
                  <HStack justify="space-between">
                    <Text color="fg.muted" fontSize="sm">
                      วันที่เริ่มสัญญา
                    </Text>
                    <Text fontSize="sm">
                      {contract?.start_date
                        ? formatDate(contract.start_date, "long")
                        : "-"}
                    </Text>
                  </HStack>
                  <HStack justify="space-between" align="start">
                    <Text color="fg.muted" fontSize="sm">
                      วันที่สิ้นสุดสัญญา
                    </Text>
                    <VStack align="end" gap={1}>
                      <Text fontSize="sm">
                        {contract?.end_date
                          ? formatDate(contract.end_date, "long")
                          : "-"}
                      </Text>
                      {contract?.status === "active" && contract?.end_date && (
                        <Badge
                          colorPalette={expiryHighlight?.badge || "gray"}
                          size="xs"
                        >
                          {formatRemainingDuration(contract.end_date)}
                        </Badge>
                      )}
                    </VStack>
                  </HStack>
                </VStack>
              </Card.Body>
            </Card.Root>
          </VStack>
        </Grid>
      )}

      {tenantId && !contractLoading && !contract && (
        <Card.Root>
          <Card.Body>
            <Text color="fg.muted">
              ยังไม่พบสัญญาที่กำลังใช้งานสำหรับบัญชีนี้
            </Text>
          </Card.Body>
        </Card.Root>
      )}

      {contract && (
        <Card.Root>
          <Card.Header>
            <Heading size="lg">อัตราค่าบริการ</Heading>
          </Card.Header>
          <Card.Body>
            <Grid
              templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }}
              gap={6}
            >
              <HStack align="start" justify="space-between">
                <VStack align="start" gap={1}>
                  <Text color="fg.muted" fontSize="sm">
                    ค่าเช่า (บาท/เดือน)
                  </Text>
                  <Heading size="xl">
                    {formatCurrency(displayRent || 0)}
                  </Heading>
                </VStack>
                <Box p={3} bg="blue.subtle" borderRadius="lg" color="blue.fg">
                  <Icon fontSize="xl">
                    <LuHouse />
                  </Icon>
                </Box>
              </HStack>

              <HStack align="start" justify="space-between">
                <VStack align="start" gap={1}>
                  <Text color="fg.muted" fontSize="sm">
                    ค่าส่วนกลาง (บาท/เดือน)
                  </Text>
                  <Heading size="xl">
                    {formatCurrency(displayCommonFee || 0)}
                  </Heading>
                </VStack>
                <Box
                  p={3}
                  bg="purple.subtle"
                  borderRadius="lg"
                  color="purple.fg"
                >
                  <Icon fontSize="xl">
                    <LuUsers />
                  </Icon>
                </Box>
              </HStack>

              <HStack align="start" justify="space-between">
                <VStack align="start" gap={1}>
                  <Text color="fg.muted" fontSize="sm">
                    ค่าน้ำประปา (บาท/หน่วย)
                  </Text>
                  <Heading size="xl">
                    {formatCurrency(appSettings?.water_rate || 0)}
                  </Heading>
                </VStack>
                <Box p={3} bg="cyan.subtle" borderRadius="lg" color="cyan.fg">
                  <Icon fontSize="xl">
                    <LuDroplet />
                  </Icon>
                </Box>
              </HStack>
            </Grid>
          </Card.Body>
        </Card.Root>
      )}
    </VStack>
  );
};
