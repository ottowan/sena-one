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
import type { VehicleRegistration } from "../../types";

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
  const [vehicles, setVehicles] = useState<VehicleRegistration[]>([]);
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
        const rows = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as any)
          .filter(
            (inv) =>
              inv.contract_id === contract.id && inv.status === "pending",
          )
          .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));

        if (!cancelled) setUnpaidInvoices(rows);
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
            <Text as="span" fontSize="lg" fontWeight="normal" color="gray.500">
              {" "}
              ({positionLabel})
            </Text>
          )}
        </Heading>
        <Text color="gray.600">ยินดีต้อนรับสู่ระบบจัดการหอพัก Sena-One</Text>
        {contractLoading && (
          <Text color="gray.500" fontSize="sm" mt={2}>
            กำลังโหลดข้อมูลห้องพัก...
          </Text>
        )}
      </Box>

      <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={6}>
        <Card.Root>
          <Card.Body>
            <HStack align="start" justify="space-between">
              <VStack align="start" gap={1}>
                <Text color="gray.500" fontSize="sm">
                  ข้อมูลห้องพัก
                </Text>
                <Heading size="2xl">
                  {contract?.room?.room_number || "-"}
                </Heading>
                <Badge colorPalette="blue">
                  {contract?.room?.room_type || "Standard"}
                </Badge>
              </VStack>
              <Box p={3} bg="blue.50" borderRadius="lg" color="blue.600">
                <Icon fontSize="2xl">
                  <LuHouse />
                </Icon>
              </Box>
            </HStack>
          </Card.Body>
        </Card.Root>

        <Card.Root>
          <Card.Body>
            <HStack align="start" justify="space-between">
              <VStack align="start" gap={1}>
                <Text color="gray.500" fontSize="sm">
                  ยอดค้างชำระ
                </Text>
                <Heading
                  size="2xl"
                  color={totalDue > 0 ? "red.500" : "green.500"}
                >
                  {formatCurrency(totalDue)}
                </Heading>
                <Text fontSize="xs" color="gray.500">
                  {invoiceLoading
                    ? "กำลังอัปเดต..."
                    : `${unpaidInvoices.length} รายการที่ต้องชำระ`}
                </Text>
              </VStack>
              <Box
                p={3}
                bg={totalDue > 0 ? "red.50" : "green.50"}
                borderRadius="lg"
                color={totalDue > 0 ? "red.600" : "green.600"}
              >
                <Icon fontSize="2xl">
                  <LuWallet />
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
              <Text fontSize="md" fontWeight="bold" color="gray.700">
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
                  ? CONTRACT_STATUS_LABELS[contract.status] || contract.status
                  : "-"}
              </Badge>
            </HStack>
            <VStack align="stretch" gap={3}>
              <HStack justify="space-between">
                <Text color="gray.500" fontSize="sm">
                  วันที่เริ่มสัญญา
                </Text>
                <Text  fontSize="sm">
                  {contract?.start_date
                    ? formatDate(contract.start_date, "long")
                    : "-"}
                </Text>
              </HStack>
              <HStack justify="space-between" align="start">
                <Text color="gray.500" fontSize="sm">
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
      </Grid>

      {tenantId && !contractLoading && !contract && (
        <Card.Root>
          <Card.Body>
            <Text color="gray.600">
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
                  <Text color="gray.500" fontSize="sm">
                    ค่าเช่า (บาท/เดือน)
                  </Text>
                  <Heading size="xl">
                    {formatCurrency(displayRent || 0)}
                  </Heading>
                </VStack>
                <Box p={3} bg="blue.50" borderRadius="lg" color="blue.600">
                  <Icon fontSize="xl">
                    <LuHouse />
                  </Icon>
                </Box>
              </HStack>

              <HStack align="start" justify="space-between">
                <VStack align="start" gap={1}>
                  <Text color="gray.500" fontSize="sm">
                    ค่าส่วนกลาง (บาท/เดือน)
                  </Text>
                  <Heading size="xl">
                    {formatCurrency(displayCommonFee || 0)}
                  </Heading>
                </VStack>
                <Box p={3} bg="purple.50" borderRadius="lg" color="purple.600">
                  <Icon fontSize="xl">
                    <LuUsers />
                  </Icon>
                </Box>
              </HStack>

              <HStack align="start" justify="space-between">
                <VStack align="start" gap={1}>
                  <Text color="gray.500" fontSize="sm">
                    ค่าน้ำประปา (บาท/หน่วย)
                  </Text>
                  <Heading size="xl">
                    {formatCurrency(appSettings?.water_rate || 0)}
                  </Heading>
                </VStack>
                <Box p={3} bg="cyan.50" borderRadius="lg" color="cyan.600">
                  <Icon fontSize="xl">
                    <LuDroplet />
                  </Icon>
                </Box>
              </HStack>
            </Grid>
          </Card.Body>
        </Card.Root>
      )}

      {contract && (
        <Card.Root>
          <Card.Header>
            <HStack>
              <Icon color="blue.500" fontSize="xl">
                <LuCarFront />
              </Icon>
              <Heading size="lg">ข้อมูลรถ</Heading>
            </HStack>
          </Card.Header>
          <Card.Body>
            {vehicles.length === 0 ? (
              <Text color="gray.500" fontSize="sm">
                ยังไม่มีข้อมูลรถของห้องนี้
              </Text>
            ) : (
              <VStack align="stretch" gap={0}>
                {vehicles.map((vehicle) => {
                  const TypeIcon = VEHICLE_TYPE_ICONS[vehicle.type];
                  return (
                    <HStack
                      key={vehicle.id}
                      justify="space-between"
                      py={3}
                      borderBottomWidth="1px"
                      borderColor="gray.100"
                    >
                      <HStack gap={3}>
                        <Icon color="blue.500">
                          <TypeIcon />
                        </Icon>
                        <VStack align="start" gap={0}>
                          <Text fontWeight="medium">
                            {vehicle.plate} {vehicle.province}
                          </Text>
                          <Text fontSize="sm" color="gray.500">
                            {VEHICLE_TYPE_LABELS[vehicle.type]}
                            {vehicle.brand ? ` · ${vehicle.brand}` : ""}
                            {vehicle.color ? ` (${vehicle.color})` : ""}
                          </Text>
                        </VStack>
                      </HStack>
                      {vehicle.has_sticker ? (
                        <Badge colorPalette="green">มีสติ๊กเกอร์</Badge>
                      ) : (
                        <Badge colorPalette="gray">ไม่มีสติ๊กเกอร์</Badge>
                      )}
                    </HStack>
                  );
                })}
              </VStack>
            )}
          </Card.Body>
        </Card.Root>
      )}
    </VStack>
  );
};
