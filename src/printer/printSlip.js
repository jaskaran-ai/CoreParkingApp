import { BluetoothEscposPrinter, isModuleAvailable } from './bluetoothPrinter';

const SLIP_TITLE = 'Parking Ticket';
const SLIP_NOTE = '* Double the ticket if slip lost';
const BOTTOM_FEED_LINES = 8;

function hasValue(value) {
	return value !== undefined && value !== null && String(value).trim() !== '';
}

function pickValue(source, keys) {
	if (!source) {
		return null;
	}

	for (const key of keys) {
		const value = source[key];
		if (hasValue(value)) {
			return value;
		}
	}

	return null;
}

export function formatSlipDateTime(date = new Date()) {
	const dd = String(date.getDate()).padStart(2, '0');
	const mm = String(date.getMonth() + 1).padStart(2, '0');
	const yyyy = date.getFullYear();
	let hours = date.getHours();
	const ampm = hours >= 12 ? 'PM' : 'AM';
	hours = hours % 12 || 12;
	const minutes = String(date.getMinutes()).padStart(2, '0');

	return `${dd}/${mm}/${yyyy} ${hours}:${minutes} ${ampm}`;
}

export function extractParkingDetails(response) {
	const root = response?.data ?? response ?? {};
	const level1 =
		root?.data && typeof root.data === 'object' && !Array.isArray(root.data)
			? root.data
			: typeof root === 'object' && !Array.isArray(root)
				? root
				: {};

	const candidates = [
		level1?.parkingDetails,
		level1?.parking_details,
		level1?.parkingDetail,
		level1?.parking_detail,
		level1?.parking,
		level1?.ticket,
		level1?.ticket_details,
		level1?.ticketDetails,
		level1?.session,
		level1?.vehile,
		root?.parkingDetails,
		root?.parking_details,
	].filter(item => item && typeof item === 'object' && !Array.isArray(item));

	let nestedDetails = {};

	for (const candidate of candidates) {
		const hasParkingData = pickValue(candidate, [
			'bill_number',
			'billNumber',
			'bill_no',
			'billNo',
			'vehicle_number',
			'vehicleNo',
			'vehicleNumber',
			'vehicle_no',
			'plate_number',
			'entry_date',
			'entryDate',
			'checked_in_at',
			'id',
			'parking_id',
			'parkingId',
		]);

		if (hasParkingData) {
			nestedDetails = candidate;
			break;
		}
	}

	if (Object.keys(nestedDetails).length > 0) {
		const merged = { ...nestedDetails };

		const vehicleTypeAndFare =
			nestedDetails?.get_vehicle_type_and_fare ||
			nestedDetails?.vehicle_type_and_fare ||
			level1?.get_vehicle_type_and_fare ||
			level1?.vehicle_type_and_fare;

		if (vehicleTypeAndFare) {
			merged.get_vehicle_type_and_fare = vehicleTypeAndFare;
		}

		return merged;
	}

	const hasLevel1ParkingData = pickValue(level1, [
		'vehicle_number',
		'vehicleNo',
		'vehicleNumber',
		'vehicle_no',
		'plate_number',
		'entry_date',
		'entryDate',
		'checked_in_at',
		'id',
		'parking_id',
		'parkingId',
		'amount',
	]);

	if (hasLevel1ParkingData) {
		const merged = { ...level1 };

		if (level1?.vehicle_type_and_fare && !merged.get_vehicle_type_and_fare) {
			merged.get_vehicle_type_and_fare = level1.vehicle_type_and_fare;
		}

		return merged;
	}

	return {};
}

export function getResponseMessage(response) {
	return response?.data?.data?.message || response?.data?.message || '';
}

function parseEntryDate(entryDate) {
	if (!hasValue(entryDate)) {
		return null;
	}

	const value = String(entryDate).trim();
	const match = value.match(
		/^(\d{2})-(\d{2})-(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i,
	);

	if (!match) {
		const parsed = new Date(value);
		return Number.isNaN(parsed.getTime()) ? null : parsed;
	}

	let hours = parseInt(match[4], 10);
	const minutes = parseInt(match[5], 10);
	const seconds = parseInt(match[6], 10);
	const meridiem = match[7].toUpperCase();

	if (meridiem === 'PM' && hours < 12) {
		hours += 12;
	}
	if (meridiem === 'AM' && hours === 12) {
		hours = 0;
	}

	return new Date(
		parseInt(match[3], 10),
		parseInt(match[2], 10) - 1,
		parseInt(match[1], 10),
		hours,
		minutes,
		seconds,
	);
}

export function calculateParkingDays(entryDate) {
	const entry = parseEntryDate(entryDate);
	if (!entry) {
		return 1;
	}

	const now = new Date();
	const diffMs = now.getTime() - entry.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	return Math.max(1, diffDays + 1);
}

export function calculateParkingAmount(details, parkingDays) {
	const days = Math.max(1, Number(parkingDays) || 1);
	const fare =
		pickValue(details?.get_vehicle_type_and_fare, ['amount', 'fare']) ||
		pickValue(details, ['amount', 'fare', 'vehicleTypeAmount']) ||
		0;

	return Number(fare) * days;
}

export function enrichSearchDetails(response) {
	const root = response?.data?.data ?? response?.data ?? {};
	const details = normalizeParkingRecord(extractParkingDetails(response));

	if (!details) {
		return null;
	}

	const parkingDays = Math.max(
		1,
		Number(
			root.parkingDays ??
			root.parking_days ??
			root.totaldays ??
			calculateParkingDays(details.entry_date),
		) || 1,
	);

	const session = root.session && typeof root.session === 'object' ? root.session : {};
	const vehicleType =
		details.vehicle_type ||
		details.vehicleType ||
		details.get_vehicle_type_and_fare?.vehicle_type ||
		session.vehicle_type ||
		session.get_vehicle_type_and_fare?.vehicle_type ||
		root.vehicle_type ||
		'';
	const amount =
		details.total_payable_amount ??
		details.amount ??
		session.total_payable_amount ??
		session.amount ??
		root.totalPayableAmount ??
		root.total_payable_amount ??
		root.amount ??
		calculateParkingAmount(
			{
				...details,
				get_vehicle_type_and_fare:
					details.get_vehicle_type_and_fare || session.get_vehicle_type_and_fare,
			},
			parkingDays,
		);

	return {
		...details,
		vehicle_type: vehicleType,
		get_vehicle_type_and_fare:
			details.get_vehicle_type_and_fare ||
			session.get_vehicle_type_and_fare ||
			(vehicleType ? {vehicle_type: vehicleType} : null),
		totaldays: details.totaldays || session.totaldays || parkingDays,
		amount,
	};
}

export function isFailureMessage(message) {
	if (!hasValue(message)) {
		return false;
	}

	const lower = String(message).toLowerCase();
	return (
		lower.includes('not available') ||
		lower.includes('not found') ||
		lower.includes('no record')
	);
}

export function normalizeParkingRecord(details) {
	if (!details || typeof details !== 'object') {
		return null;
	}

	const id =
		pickValue(details, ['id', 'parking_id', 'parkingId', 'parkingID']) || null;
	const vehicleNumber = pickValue(details, [
		'vehicle_number',
		'vehicleNo',
		'vehicleNumber',
		'vehicle_no',
		'plate_number',
	]);
	const billNumber = pickValue(details, [
		'slip_number',
		'slipNumber',
		'bill_number',
		'billNumber',
		'bill_no',
		'billNo',
	]);

	return {
		...details,
		id,
		vehicle_number: vehicleNumber || details.vehicle_number,
		entry_date:
			pickValue(details, ['entry_date', 'entryDate', 'checked_in_at']) ||
			details.entry_date,
		out_date:
			pickValue(details, [
				'out_date',
				'outDate',
				'exit_date',
				'exitDate',
				'checked_out_at',
			]) || details.out_date,
		slip_number: billNumber || details.slip_number,
		bill_number: billNumber || details.bill_number,
		vehicle_type:
			pickValue(details?.get_vehicle_type_and_fare, ['vehicle_type', 'vehicleType']) ||
			pickValue(details, ['vehicle_type', 'vehicleType', 'vehicle_type_name']) ||
			details.vehicle_type,
		get_vehicle_type_and_fare:
			details?.get_vehicle_type_and_fare ||
			details?.vehicle_type_and_fare ||
			details?.vehicleTypeAndFare ||
			(hasValue(details?.vehicle_type)
				? { vehicle_type: details.vehicle_type }
				: null),
	};
}

function isActiveParkingRecord(record) {
	const hasOutDate = pickValue(record, ['out_date', 'outDate', 'exit_date']);
	const hasOutEmployee = pickValue(record, ['out_employee_id', 'outEmployeeId']);
	return !hasOutDate && !hasOutEmployee;
}

export function isValidParkingRecord(details) {
	const record = normalizeParkingRecord(details);

	if (!record) {
		return false;
	}

	if (!isActiveParkingRecord(record)) {
		return false;
	}

	const hasIdentifier = hasValue(record.id);
	const hasVehicle = hasValue(record.vehicle_number);
	const hasBill = hasValue(record.bill_number);
	const hasEntry = pickValue(record, [
		'entry_date',
		'entryDate',
		'checked_in_at',
	]);

	return Boolean(
		(hasIdentifier && (hasVehicle || hasBill)) || (hasVehicle && hasEntry),
	);
}

export function buildExitPrintDetails(savedDetails, apiDetails = {}) {
	return {
		...savedDetails,
		...(apiDetails?.vehicle_number || apiDetails?.vehicleNo
			? apiDetails
			: pickParkingFields(apiDetails)),
		vehicle_number:
			pickValue(apiDetails, [
				'vehicle_number',
				'vehicleNo',
				'vehicle_no',
				'plate_number',
			]) || savedDetails?.vehicle_number,
		entry_date:
			pickValue(apiDetails, ['entry_date', 'entryDate', 'checked_in_at']) ||
			savedDetails?.entry_date,
		out_date:
			pickValue(apiDetails, [
				'out_date',
				'outDate',
				'exit_date',
				'exitDate',
				'checked_out_at',
			]) || savedDetails?.out_date,
		totaldays:
			pickValue(apiDetails, ['totaldays', 'totalDays', 'total_days', 'days']) ||
			savedDetails?.totaldays,
		amount:
			pickValue(apiDetails, [
				'amount',
				'total_amount',
				'totalAmount',
				'fare',
				'parking_amount',
				'parkingAmount',
			]) ?? savedDetails?.amount,
		get_vehicle_type_and_fare:
			apiDetails?.get_vehicle_type_and_fare ||
			savedDetails?.get_vehicle_type_and_fare,
	};
}

export function buildExitPrintExtras(savedDetails, apiDetails = {}) {
	const merged = buildExitPrintDetails(savedDetails, apiDetails);

	return {
		vehicleNumber: merged?.vehicle_number,
		vehicleTypeName: merged?.get_vehicle_type_and_fare?.vehicle_type,
		entryDate: merged?.entry_date,
		outDate: merged?.out_date,
		totaldays: merged?.totaldays,
		amount: merged?.amount,
	};
}

function pickParkingFields(details) {
	const fields = {};

	const assign = (key, value) => {
		if (hasValue(value)) {
			fields[key] = value;
		}
	};

	assign('id', pickValue(details, ['id']));
	assign(
		'vehicle_number',
		pickValue(details, ['vehicle_number', 'vehicleNo', 'vehicle_no', 'plate_number']),
	);
	assign(
		'entry_date',
		pickValue(details, ['entry_date', 'entryDate', 'checked_in_at']),
	);
	assign(
		'out_date',
		pickValue(details, ['out_date', 'outDate', 'exit_date', 'exitDate', 'checked_out_at']),
	);
	assign(
		'totaldays',
		pickValue(details, ['totaldays', 'totalDays', 'total_days', 'days']),
	);
	assign(
		'amount',
		pickValue(details, [
			'amount',
			'total_amount',
			'totalAmount',
			'fare',
			'parking_amount',
			'parkingAmount',
		]),
	);

	return fields;
}

function getVehicleType(details, extras = {}) {
	return (
		pickValue(details?.get_vehicle_type_and_fare, ['vehicle_type', 'vehicleType']) ||
		pickValue(details, [
			'vehicle_type',
			'vehicleType',
			'vehicle_type_name',
			'vehicleTypeName',
			'type',
		]) ||
		extras.vehicleTypeName ||
		'-'
	);
}

function formatVehicleNumber(value) {
	if (!hasValue(value)) {
		return '-';
	}

	const compact = String(value)
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, '');
	const indian = compact.match(/^([A-Z]{2})([0-9]{1,2})([A-Z]{1,3})([0-9]{4})$/);
	if (indian) {
		return `${indian[1]}${indian[2]} ${indian[3]} ${indian[4]}`;
	}

	return String(value).trim().toUpperCase();
}

function normalizeDetails(details = {}, extras = {}) {
	const rawVehicleNumber =
		pickValue(details, [
			'vehicle_number',
			'vehicleNo',
			'vehicle_no',
			'plate_number',
		]) ||
		extras.vehicleNumber ||
		'-';

	return {
		bill_number:
			pickValue(details, [
				'bill_number',
				'billNumber',
				'bill_no',
				'billNo',
				'ticket_number',
				'ticketNumber',
				'ticket_no',
			]) ||
			extras.billNumber ||
			'-',
		vehicle_number: formatVehicleNumber(rawVehicleNumber),
		vehicle_type: getVehicleType(details, extras),
		entry_date:
			pickValue(details, [
				'entry_date',
				'entryDate',
				'entry_time',
				'entryTime',
				'checked_in_at',
				'created_at',
				'createdAt',
				'date',
			]) ||
			extras.entryDate ||
			formatSlipDateTime(),
		out_date:
			pickValue(details, [
				'out_date',
				'outDate',
				'exit_date',
				'exitDate',
				'checked_out_at',
			]) ||
			extras.outDate ||
			null,
		totaldays:
			pickValue(details, ['totaldays', 'totalDays', 'total_days', 'days', 'parkingDays']) ||
			extras.totaldays ||
			calculateParkingDays(
				pickValue(details, ['entry_date', 'entryDate', 'checked_in_at']) ||
					extras.entryDate,
			),
		amount:
			pickValue(details, [
				'amount',
				'total_amount',
				'totalAmount',
				'totalPayableAmount',
				'fare',
				'parking_amount',
				'parkingAmount',
			]) ??
			extras.amount ??
			calculateParkingAmount(
				details,
				pickValue(details, ['totaldays', 'totalDays', 'total_days', 'days']) ||
				extras.totaldays,
			),
	};
}

async function printRow(label, value) {
	const displayValue = hasValue(value) ? String(value) : '-';

	await BluetoothEscposPrinter.printColumn(
		[14, 18],
		[0, 2],
		[label, displayValue],
		{ encoding: 'UTF-8', widthtimes: 0, heigthtimes: 0, fonttype: 0 },
	);
}

async function printDateRow(label, value, ALIGN) {
	const displayValue = hasValue(value) ? String(value) : '-';

	await BluetoothEscposPrinter.printerAlign(ALIGN.LEFT);
	await BluetoothEscposPrinter.printText(`${label}:\n\r`, {
		encoding: 'UTF-8',
		widthtimes: 0,
		heigthtimes: 0,
		fonttype: 0,
	});
	await BluetoothEscposPrinter.printerAlign(ALIGN.RIGHT);
	await BluetoothEscposPrinter.printText(`${displayValue}\n\r`, {
		encoding: 'UTF-8',
		widthtimes: 0,
		heigthtimes: 0,
		fonttype: 0,
	});
	await BluetoothEscposPrinter.printerAlign(ALIGN.LEFT);
}

export async function printParkingSlip(slipType, rawDetails, extras = {}) {
	if (!isModuleAvailable()) {
		throw new Error('Bluetooth printer module is not available');
	}

	const details = normalizeDetails(rawDetails, extras);
	const ALIGN = BluetoothEscposPrinter.ALIGN;
	const slipLabel = slipType === 'IN' ? 'ENTRY SLIP' : 'EXIT SLIP';

	await BluetoothEscposPrinter.printerInit();
	await BluetoothEscposPrinter.printerAlign(ALIGN.CENTER);
	await BluetoothEscposPrinter.printText(`${SLIP_TITLE}\n\r`, {
		encoding: 'UTF-8',
		widthtimes: 1,
		heigthtimes: 1,
		fonttype: 1,
	});
	await BluetoothEscposPrinter.printText(`${slipLabel}\n\r`, {
		encoding: 'UTF-8',
		widthtimes: 0,
		heigthtimes: 0,
		fonttype: 1,
	});
	await BluetoothEscposPrinter.printText('--------------------------------\n\r', {
		encoding: 'UTF-8',
	});

	await BluetoothEscposPrinter.printerAlign(ALIGN.LEFT);
	await printRow('Vehicle Type', details.vehicle_type);
	await printRow('Vehicle No', details.vehicle_number);
	await printDateRow('Entry Date', details.entry_date, ALIGN);

	if (slipType === 'OUT') {
		if (hasValue(details.out_date)) {
			await printDateRow('Exit Date', details.out_date, ALIGN);
		}
		await printRow('Days', details.totaldays ?? 1);
		await printRow(
			'Amount',
			hasValue(details.amount) ? `${details.amount} RS` : '-',
		);
	}

	await BluetoothEscposPrinter.printerAlign(ALIGN.CENTER);

	if (slipType === 'IN') {
		await BluetoothEscposPrinter.printText(`\n${SLIP_NOTE}\n\r`, {
			encoding: 'UTF-8',
		});
	}

	await BluetoothEscposPrinter.printText('\n\n\n\r', {
		encoding: 'UTF-8',
	});
	await BluetoothEscposPrinter.printAndFeed(BOTTOM_FEED_LINES);
}

export async function printEntrySlip(rawDetails, extras = {}) {
	return printParkingSlip('IN', rawDetails, extras);
}

export async function printExitSlip(rawDetails, extras = {}) {
	return printParkingSlip('OUT', rawDetails, extras);
}