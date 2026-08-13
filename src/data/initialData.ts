import { BillingRecord } from '../types';
import { buildDefaultIRFData } from '../utils/irfHelper';

export const INITIAL_BILLING_RECORDS: BillingRecord[] = [
  {
    id: 'REC-2026-001',
    airline: 'PT Sriwijaya Air',
    vendor: 'PT 21 Express',
    periode: '01 - 15 Jan 2026',
    noInvoice: 'INV/SJ/2026/01/008',
    noIrf: '002/SJ-CRG/SUB/VII/2026',
    nominal: 2663250,
    createdAt: '2026-01-16',
    updatedAt: '2026-02-10',
    overallStatus: 'Completed HO',
    catatanUtama: 'Dokumen IRF resmi terbit, pembayaran tepat waktu via Bank Mandiri.',
    stages: {
      penerimaan_data: { completed: true, emailDate: '2026-01-16', notes: 'Datamanifest penerbangan diterima' },
      irf: { completed: true, emailDate: '2026-01-18', notes: 'IRF No. 002/SJ-CRG/SUB/VII/2026 terbit' },
      irf_ho: { completed: true, emailDate: '2026-01-20', notes: 'Diterima Keuangan HO' },
      invoice: { completed: true, emailDate: '2026-01-22', notes: 'Invoice fisik & PDF siap' },
      faktur: { completed: true, emailDate: '2026-01-23', notes: 'Faktur Pajak terbit Seri 010.002-26.000123' },
      email_vendor: { completed: true, emailDate: '2026-01-25', notes: 'Email tagihan terkirim ke AR 21 Express' },
      pembayaran: { completed: true, emailDate: '2026-02-08', notes: 'Lunas via Transfer Mandiri' },
      laporan_ho: { completed: true, emailDate: '2026-02-10', notes: 'Laporan pembayaran mingguan terkirim ke HO' }
    },
    irfDetail: {
      requestor: 'Fathul Aziz',
      department: 'Finance & GA',
      noIrf: '002/SJ-CRG/SUB/VII/2026',
      date: '29 Juli 2026',
      isRevision: false,
      companyName: 'PT.ANDALAN 21 EXPRESS',
      companyAddress: 'Jl.Jemur Andayani 50 Blok D 101-102 Surabaya',
      contactPerson: 'SUTOPO',
      phone: '031-8472140',
      mobile: '081330073456',
      email: 'sutopo_21express@yahoo.com',
      taxStatus: 'Excluded',
      reference: "smu.21sub@g21express.co.id'",
      specialInstruction: 'PT. SRIWIJAYA AIR',
      items: [
        { no: 1, description: 'Tagihan Incoming Periode Januari 2026', qty: 1846, rate: 250, amount: 461500 },
        { no: 2, description: 'Tagihan Incoming Periode Februari 2026', qty: 2440, rate: 250, amount: 610000 },
        { no: 3, description: 'Tagihan Incoming Periode Maret 2026', qty: 1148, rate: 250, amount: 287000 },
        { no: 4, description: 'Tagihan Incoming Periode April 2026', qty: 2509, rate: 250, amount: 627250 },
        { no: 5, description: 'Tagihan Incoming Periode Mei 2026', qty: 1489, rate: 250, amount: 372250 },
        { no: 6, description: 'Tagihan Incoming Periode Juni 2026', qty: 1221, rate: 250, amount: 305250 }
      ],
      totalAmount: 2663250
    }
  },
  {
    id: 'REC-2026-002',
    airline: 'PT NAM Air',
    vendor: 'PT 21 Express',
    periode: '01 - 15 Jan 2026',
    noInvoice: 'INV/IN/2026/01/014',
    noIrf: '002/IN-CRG/SUB/VII/2026',
    nominal: 1242500,
    createdAt: '2026-01-16',
    updatedAt: '2026-02-11',
    overallStatus: 'Completed HO',
    catatanUtama: 'IRF No. 002/IN-CRG/SUB/VII/2026 dikirimkan.',
    stages: {
      penerimaan_data: { completed: true, emailDate: '2026-01-16', notes: 'Data periode diterima lengkap' },
      irf: { completed: true, emailDate: '2026-01-18', notes: 'IRF No. 002/IN-CRG/SUB/VII/2026 terbit' },
      irf_ho: { completed: true, emailDate: '2026-01-21', notes: 'IRF HO approved' },
      invoice: { completed: true, emailDate: '2026-01-24', notes: 'Invoice dicetak' },
      faktur: { completed: true, emailDate: '2026-01-25', notes: 'Faktur Pajak approved' },
      email_vendor: { completed: true, emailDate: '2026-01-26', notes: 'Dikirim ke e-mail Finance 21 Express' },
      pembayaran: { completed: true, emailDate: '2026-02-09', notes: 'Dana masuk BNI' },
      laporan_ho: { completed: true, emailDate: '2026-02-11', notes: 'Sudah dilaporkan di rekap HO' }
    },
    irfDetail: {
      requestor: 'Fathul Aziz',
      department: 'Finance & GA',
      noIrf: '002/IN-CRG/SUB/VII/2026',
      date: '31 Juli 2026',
      isRevision: false,
      companyName: 'PT.ANDALAN 21 EXPRESS',
      companyAddress: 'Jl.Jemur Andayani 50 Blok D 101-102 Surabaya',
      contactPerson: 'SUTOPO',
      phone: '031-8472140',
      mobile: '081330073456',
      email: 'sutopo_21express@yahoo.com',
      taxStatus: 'Excluded',
      reference: "smu.21sub@g21express.co.id'",
      specialInstruction: 'PT. NAM AIR',
      items: [
        { no: 1, description: 'Tagihan Incoming Periode Januari 2026', qty: 1135, rate: 250, amount: 283750 },
        { no: 2, description: 'Tagihan Incoming Periode Februari 2026', qty: 1706, rate: 250, amount: 426500 },
        { no: 3, description: 'Tagihan Incoming Periode Maret 2026', qty: 402, rate: 250, amount: 100500 },
        { no: 4, description: 'Tagihan Incoming Periode April 2026', qty: 615, rate: 250, amount: 153750 },
        { no: 5, description: 'Tagihan Incoming Periode Mei 2026', qty: 894, rate: 250, amount: 223500 },
        { no: 6, description: 'Tagihan Incoming Periode Juni 2026', qty: 218, rate: 250, amount: 54500 }
      ],
      totalAmount: 1242500
    }
  },
  {
    id: 'REC-2026-003',
    airline: 'PT Sriwijaya Air',
    vendor: 'PT Mitra Kargo Nusantara',
    periode: '16 - 31 Jan 2026',
    noInvoice: 'INV/SJ/2026/01/045',
    noIrf: '003/SJ-CRG/SUB/VII/2026',
    nominal: 210800000,
    createdAt: '2026-02-01',
    updatedAt: '2026-02-12',
    overallStatus: 'Paid',
    catatanUtama: 'Menunggu proses pembuatan laporan resmi ke HO akhir pekan.',
    stages: {
      penerimaan_data: { completed: true, emailDate: '2026-02-01', notes: 'Data AWB terlampir' },
      irf: { completed: true, emailDate: '2026-02-03', notes: 'IRF No. 003/SJ-CRG/SUB/VII/2026 terbuat' },
      irf_ho: { completed: true, emailDate: '2026-02-04', notes: 'Acc HO' },
      invoice: { completed: true, emailDate: '2026-02-05', notes: 'Invoice rilis' },
      faktur: { completed: true, emailDate: '2026-02-06', notes: 'Faktur Pajak valid' },
      email_vendor: { completed: true, emailDate: '2026-02-07', notes: 'Email ke MKN Finance' },
      pembayaran: { completed: true, emailDate: '2026-02-12', notes: 'Pembayaran diterima Rp 210.800.000' },
      laporan_ho: { completed: false, emailDate: '', notes: 'Perlu dimasukkan rekap HO minggu ini' }
    }
  },
  {
    id: 'REC-2026-004',
    airline: 'PT NAM Air',
    vendor: 'PT Mitra Kargo Nusantara',
    periode: '16 - 31 Jan 2026',
    noInvoice: 'INV/IN/2026/01/038',
    noIrf: '003/IN-CRG/SUB/VII/2026',
    nominal: 94500000,
    createdAt: '2026-02-01',
    updatedAt: '2026-02-10',
    overallStatus: 'In Progress',
    catatanUtama: 'Vendor janji bayar tanggal 15 Februari 2026.',
    stages: {
      penerimaan_data: { completed: true, emailDate: '2026-02-01', notes: 'Data OK' },
      irf: { completed: true, emailDate: '2026-02-03', notes: 'IRF OK' },
      irf_ho: { completed: true, emailDate: '2026-02-04', notes: 'IRF HO OK' },
      invoice: { completed: true, emailDate: '2026-02-05', notes: 'Invoice terkirim' },
      faktur: { completed: true, emailDate: '2026-02-06', notes: 'Faktur Pajak terlampir' },
      email_vendor: { completed: true, emailDate: '2026-02-07', notes: 'Terkirim ke Billing MKN' },
      pembayaran: { completed: false, emailDate: '', notes: 'Follow up tanggal 14 Feb' },
      laporan_ho: { completed: false, emailDate: '', notes: '' }
    }
  },
  {
    id: 'REC-2026-005',
    airline: 'PT Sriwijaya Air',
    vendor: 'PT Gatrans Mulia Indonesia',
    periode: '01 - 15 Feb 2026',
    noInvoice: 'INV/SJ/2026/02/003',
    noIrf: '004/SJ-CRG/SUB/VIII/2026',
    nominal: 168000000,
    createdAt: '2026-02-16',
    updatedAt: '2026-02-18',
    overallStatus: 'In Progress',
    catatanUtama: 'Proses IRF HO telah dikirimkan via email.',
    stages: {
      penerimaan_data: { completed: true, emailDate: '2026-02-16', notes: 'Revisi data manifest selesai' },
      irf: { completed: true, emailDate: '2026-02-17', notes: 'IRF cabang terbit' },
      irf_ho: { completed: true, emailDate: '2026-02-18', notes: 'Email IRF ke HO terkirim' },
      invoice: { completed: true, emailDate: '2026-02-19', notes: 'Draf Invoice dicetak' },
      faktur: { completed: false, emailDate: '', notes: 'Menunggu e-faktur dari Pajak' },
      email_vendor: { completed: false, emailDate: '', notes: '' },
      pembayaran: { completed: false, emailDate: '', notes: '' },
      laporan_ho: { completed: false, emailDate: '', notes: '' }
    }
  },
  {
    id: 'REC-2026-006',
    airline: 'PT NAM Air',
    vendor: 'PT Gatrans Mulia Indonesia',
    periode: '01 - 15 Feb 2026',
    noInvoice: 'INV/IN/2026/02/007',
    noIrf: '004/IN-CRG/SUB/VIII/2026',
    nominal: 112300000,
    createdAt: '2026-02-16',
    updatedAt: '2026-02-17',
    overallStatus: 'In Progress',
    catatanUtama: 'Tahap pengajuan IRF ke HO.',
    stages: {
      penerimaan_data: { completed: true, emailDate: '2026-02-16', notes: 'Data cargo diterima' },
      irf: { completed: true, emailDate: '2026-02-17', notes: 'IRF diproses' },
      irf_ho: { completed: false, emailDate: '', notes: 'Antrian verification HO' },
      invoice: { completed: false, emailDate: '', notes: '' },
      faktur: { completed: false, emailDate: '', notes: '' },
      email_vendor: { completed: false, emailDate: '', notes: '' },
      pembayaran: { completed: false, emailDate: '', notes: '' },
      laporan_ho: { completed: false, emailDate: '', notes: '' }
    }
  }
];
