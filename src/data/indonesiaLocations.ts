import { ProvinceInfo } from '../types/gis';

export interface LocationSearchResult {
  name: string;
  category: 'Kota' | 'Provinsi' | 'Gunung Berapi' | 'Kepulauan' | 'Selat / Perairan';
  lat: number;
  lng: number;
  zoom: number;
  detail: string;
}

export const INDONESIA_LOCATIONS: LocationSearchResult[] = [
  // Capitals and Major Cities
  { name: 'DKI Jakarta', category: 'Kota', lat: -6.2088, lng: 106.8456, zoom: 11, detail: 'Ibu Kota Negara / Pusat Pemerintahan' },
  { name: 'Ibu Kota Nusantara (IKN)', category: 'Kota', lat: -0.9634, lng: 116.7029, zoom: 12, detail: 'Pusat Pemerintahan Masa Depan, Kaltim' },
  { name: 'Surabaya', category: 'Kota', lat: -7.2575, lng: 112.7521, zoom: 11, detail: 'Jawa Timur' },
  { name: 'Bandung', category: 'Kota', lat: -6.9175, lng: 107.6191, zoom: 11, detail: 'Jawa Barat' },
  { name: 'Medan', category: 'Kota', lat: 3.5952, lng: 98.6722, zoom: 11, detail: 'Sumatera Utara' },
  { name: 'Semarang', category: 'Kota', lat: -6.9667, lng: 110.4167, zoom: 11, detail: 'Jawa Tengah' },
  { name: 'Makassar', category: 'Kota', lat: -5.1477, lng: 119.4327, zoom: 11, detail: 'Sulawesi Selatan' },
  { name: 'Palembang', category: 'Kota', lat: -2.9761, lng: 104.7754, zoom: 11, detail: 'Sumatera Selatan' },
  { name: 'Banda Aceh', category: 'Kota', lat: 5.5483, lng: 95.3238, zoom: 11, detail: 'Aceh' },
  { name: 'Padang', category: 'Kota', lat: -0.9471, lng: 100.4172, zoom: 11, detail: 'Sumatera Barat' },
  { name: 'Pekanbaru', category: 'Kota', lat: 0.5071, lng: 101.4478, zoom: 11, detail: 'Riau' },
  { name: 'Denpasar', category: 'Kota', lat: -8.6705, lng: 115.2126, zoom: 11, detail: 'Bali' },
  { name: 'Mataram', category: 'Kota', lat: -8.5833, lng: 116.1167, zoom: 11, detail: 'Nusa Tenggara Barat' },
  { name: 'Kupang', category: 'Kota', lat: -10.1772, lng: 123.607, zoom: 11, detail: 'Nusa Tenggara Timur' },
  { name: 'Pontianak', category: 'Kota', lat: -0.0263, lng: 109.3425, zoom: 11, detail: 'Kalimantan Barat' },
  { name: 'Banjarmasin', category: 'Kota', lat: -3.3194, lng: 114.5908, zoom: 11, detail: 'Kalimantan Selatan' },
  { name: 'Samarinda', category: 'Kota', lat: -0.5022, lng: 117.1536, zoom: 11, detail: 'Kalimantan Timur' },
  { name: 'Balikpapan', category: 'Kota', lat: -1.2379, lng: 116.8529, zoom: 11, detail: 'Kalimantan Timur' },
  { name: 'Manado', category: 'Kota', lat: 1.4748, lng: 124.8421, zoom: 11, detail: 'Sulawesi Utara' },
  { name: 'Palu', category: 'Kota', lat: -0.9003, lng: 119.8779, zoom: 11, detail: 'Sulawesi Tengah (Sesar Palu-Koro)' },
  { name: 'Kendari', category: 'Kota', lat: -3.9985, lng: 122.5126, zoom: 11, detail: 'Sulawesi Tenggara' },
  { name: 'Ambon', category: 'Kota', lat: -3.6547, lng: 128.1906, zoom: 11, detail: 'Maluku' },
  { name: 'Jayapura', category: 'Kota', lat: -2.5337, lng: 140.7181, zoom: 11, detail: 'Papua' },
  { name: 'Sorong', category: 'Kota', lat: -0.8762, lng: 131.2558, zoom: 11, detail: 'Papua Barat Daya' },
  { name: 'Merauke', category: 'Kota', lat: -8.4991, lng: 140.4019, zoom: 11, detail: 'Papua Selatan' },
  { name: 'Yogyakarta', category: 'Kota', lat: -7.7956, lng: 110.3695, zoom: 12, detail: 'D.I. Yogyakarta' },

  // Active Volcanoes (Monitoring Geologi & Kebencanaan)
  { name: 'Gunung Merapi', category: 'Gunung Berapi', lat: -7.5407, lng: 110.4457, zoom: 12, detail: 'Jawa Tengah / D.I. Yogyakarta (Status Aktif)' },
  { name: 'Gunung Anak Krakatau', category: 'Gunung Berapi', lat: -6.102, lng: 105.423, zoom: 12, detail: 'Selat Sunda, Lampung' },
  { name: 'Gunung Semeru', category: 'Gunung Berapi', lat: -8.108, lng: 112.922, zoom: 12, detail: 'Jawa Timur (Puncak Tertinggi Jawa)' },
  { name: 'Gunung Bromo', category: 'Gunung Berapi', lat: -7.9425, lng: 112.953, zoom: 12, detail: 'Taman Nasional Bromo Tengger Semeru' },
  { name: 'Gunung Sinabung', category: 'Gunung Berapi', lat: 3.17, lng: 98.392, zoom: 12, detail: 'Karo, Sumatera Utara' },
  { name: 'Gunung Marapi', category: 'Gunung Berapi', lat: -0.381, lng: 100.473, zoom: 12, detail: 'Sumatera Barat' },
  { name: 'Gunung Lewotobi Laki-Laki', category: 'Gunung Berapi', lat: -8.538, lng: 122.768, zoom: 12, detail: 'Flores Timur, Nusa Tenggara Timur' },
  { name: 'Gunung Ruang', category: 'Gunung Berapi', lat: 2.303, lng: 125.367, zoom: 12, detail: 'Kepulauan Sitaro, Sulawesi Utara' },
  { name: 'Gunung Rinjani', category: 'Gunung Berapi', lat: -8.411, lng: 116.457, zoom: 12, detail: 'Lombok, Nusa Tenggara Barat' },
  { name: 'Gunung Agung', category: 'Gunung Berapi', lat: -8.343, lng: 115.508, zoom: 12, detail: 'Karangasem, Bali' },

  // Key Straits & Maritime Regions
  { name: 'Selat Malaka', category: 'Selat / Perairan', lat: 2.5, lng: 101.5, zoom: 7, detail: 'Jalur Pelayaran Internasional Utama' },
  { name: 'Selat Sunda', category: 'Selat / Perairan', lat: -5.9, lng: 105.7, zoom: 9, detail: 'Penghubung Jawa & Sumatera' },
  { name: 'Selat Makassar', category: 'Selat / Perairan', lat: -1.5, lng: 118.0, zoom: 7, detail: 'ALKI II (Alur Laut Kepulauan Indonesia)' },
  { name: 'Laut Jawa', category: 'Selat / Perairan', lat: -5.5, lng: 112.0, zoom: 6, detail: 'Perairan Pedalaman Indonesia' },
  { name: 'Laut Banda', category: 'Selat / Perairan', lat: -5.0, lng: 127.5, zoom: 6, detail: 'Cekungan Tektonik Laut Dalam' },
  { name: 'Laut Natuna Utara', category: 'Selat / Perairan', lat: 4.5, lng: 108.5, zoom: 7, detail: 'Zona Ekonomi Eksklusif Indonesia' },
  { name: 'Raja Ampat', category: 'Kepulauan', lat: -0.5, lng: 130.5, zoom: 9, detail: 'Pusat Keanekaragaman Hayati Laut, Papua Barat Daya' },
  { name: 'Kepulauan Mentawai', category: 'Kepulauan', lat: -1.9, lng: 99.3, zoom: 8, detail: 'Zona Megathrust Sumatera' },
];

export const INDONESIA_PROVINCES: ProvinceInfo[] = [
  { id: 'AC', name: 'Aceh', capital: 'Banda Aceh', island: 'Sumatera', lat: 4.6951, lng: 96.7494, areaKm2: 57956, population: '5.4 Juta' },
  { id: 'SU', name: 'Sumatera Utara', capital: 'Medan', island: 'Sumatera', lat: 2.1154, lng: 99.5451, areaKm2: 72981, population: '15.1 Juta' },
  { id: 'SB', name: 'Sumatera Barat', capital: 'Padang', island: 'Sumatera', lat: -0.7399, lng: 100.8, areaKm2: 42013, population: '5.6 Juta' },
  { id: 'RI', name: 'Riau', capital: 'Pekanbaru', island: 'Sumatera', lat: 0.2933, lng: 101.7068, areaKm2: 87023, population: '6.7 Juta' },
  { id: 'JA', name: 'Jambi', capital: 'Jambi', island: 'Sumatera', lat: -1.4852, lng: 102.4381, areaKm2: 50058, population: '3.6 Juta' },
  { id: 'SS', name: 'Sumatera Selatan', capital: 'Palembang', island: 'Sumatera', lat: -3.3194, lng: 104.1695, areaKm2: 91592, population: '8.7 Juta' },
  { id: 'BE', name: 'Bengkulu', capital: 'Bengkulu', island: 'Sumatera', lat: -3.5778, lng: 102.3464, areaKm2: 19919, population: '2.0 Juta' },
  { id: 'LA', name: 'Lampung', capital: 'Bandar Lampung', island: 'Sumatera', lat: -4.5586, lng: 105.4068, areaKm2: 34624, population: '9.2 Juta' },
  { id: 'BB', name: 'Kepulauan Bangka Belitung', capital: 'Pangkalpinang', island: 'Sumatera', lat: -2.7411, lng: 106.4406, areaKm2: 16424, population: '1.5 Juta' },
  { id: 'KR', name: 'Kepulauan Riau', capital: 'Tanjungpinang', island: 'Sumatera', lat: 3.9456, lng: 108.1429, areaKm2: 8202, population: '2.1 Juta' },
  { id: 'JK', name: 'DKI Jakarta', capital: 'Jakarta Pusat', island: 'Jawa', lat: -6.2088, lng: 106.8456, areaKm2: 661, population: '10.7 Juta' },
  { id: 'JB', name: 'Jawa Barat', capital: 'Bandung', island: 'Jawa', lat: -6.9175, lng: 107.6191, areaKm2: 35378, population: '49.4 Juta' },
  { id: 'JT', name: 'Jawa Tengah', capital: 'Semarang', island: 'Jawa', lat: -7.151, lng: 110.1403, areaKm2: 32801, population: '37.0 Juta' },
  { id: 'YO', name: 'D.I. Yogyakarta', capital: 'Yogyakarta', island: 'Jawa', lat: -7.7956, lng: 110.3695, areaKm2: 3133, population: '3.7 Juta' },
  { id: 'JI', name: 'Jawa Timur', capital: 'Surabaya', island: 'Jawa', lat: -7.5361, lng: 112.2384, areaKm2: 47800, population: '41.1 Juta' },
  { id: 'BT', name: 'Banten', capital: 'Serang', island: 'Jawa', lat: -6.4058, lng: 106.064, areaKm2: 9663, population: '12.2 Juta' },
  { id: 'BA', name: 'Bali', capital: 'Denpasar', island: 'Bali & Nusa Tenggara', lat: -8.4095, lng: 115.1889, areaKm2: 5780, population: '4.4 Juta' },
  { id: 'NB', name: 'Nusa Tenggara Barat', capital: 'Mataram', island: 'Bali & Nusa Tenggara', lat: -8.6529, lng: 117.3616, areaKm2: 18572, population: '5.4 Juta' },
  { id: 'NT', name: 'Nusa Tenggara Timur', capital: 'Kupang', island: 'Bali & Nusa Tenggara', lat: -8.6574, lng: 121.0794, areaKm2: 48718, population: '5.5 Juta' },
  { id: 'KB', name: 'Kalimantan Barat', capital: 'Pontianak', island: 'Kalimantan', lat: -0.2787, lng: 111.4753, areaKm2: 147307, population: '5.5 Juta' },
  { id: 'KT', name: 'Kalimantan Tengah', capital: 'Palangka Raya', island: 'Kalimantan', lat: -1.6815, lng: 113.3824, areaKm2: 153564, population: '2.7 Juta' },
  { id: 'KS', name: 'Kalimantan Selatan', capital: 'Banjarbaru', island: 'Kalimantan', lat: -3.0926, lng: 115.2838, areaKm2: 38744, population: '4.2 Juta' },
  { id: 'KI', name: 'Kalimantan Timur', capital: 'Samarinda', island: 'Kalimantan', lat: 0.5387, lng: 116.4194, areaKm2: 129066, population: '3.9 Juta' },
  { id: 'KU', name: 'Kalimantan Utara', capital: 'Tanjung Selor', island: 'Kalimantan', lat: 3.0731, lng: 116.0414, areaKm2: 75467, population: '0.7 Juta' },
  { id: 'SA', name: 'Sulawesi Utara', capital: 'Manado', island: 'Sulawesi', lat: 0.6247, lng: 123.975, areaKm2: 13852, population: '2.6 Juta' },
  { id: 'ST', name: 'Sulawesi Tengah', capital: 'Palu', island: 'Sulawesi', lat: -1.43, lng: 121.4456, areaKm2: 61841, population: '3.1 Juta' },
  { id: 'SN', name: 'Sulawesi Selatan', capital: 'Makassar', island: 'Sulawesi', lat: -3.6687, lng: 119.974, areaKm2: 46717, population: '9.2 Juta' },
  { id: 'SG', name: 'Sulawesi Tenggara', capital: 'Kendari', island: 'Sulawesi', lat: -4.1449, lng: 122.1746, areaKm2: 38068, population: '2.7 Juta' },
  { id: 'GO', name: 'Gorontalo', capital: 'Gorontalo', island: 'Sulawesi', lat: 0.6999, lng: 122.4467, areaKm2: 11257, population: '1.2 Juta' },
  { id: 'SR', name: 'Sulawesi Barat', capital: 'Mamuju', island: 'Sulawesi', lat: -2.8441, lng: 119.2321, areaKm2: 16787, population: '1.4 Juta' },
  { id: 'MA', name: 'Maluku', capital: 'Ambon', island: 'Maluku', lat: -3.2385, lng: 130.1453, areaKm2: 46914, population: '1.9 Juta' },
  { id: 'MU', name: 'Maluku Utara', capital: 'Sofifi', island: 'Maluku', lat: 1.5709, lng: 127.8088, areaKm2: 31982, population: '1.3 Juta' },
  { id: 'PA', name: 'Papua', capital: 'Jayapura', island: 'Papua', lat: -2.4749, lng: 140.2319, areaKm2: 82681, population: '1.0 Juta' },
  { id: 'PB', name: 'Papua Barat', capital: 'Manokwari', island: 'Papua', lat: -1.3361, lng: 133.1747, areaKm2: 60275, population: '0.6 Juta' },
  { id: 'PS', name: 'Papua Selatan', capital: 'Salor / Merauke', island: 'Papua', lat: -7.5, lng: 139.5, areaKm2: 117849, population: '0.5 Juta' },
  { id: 'PT', name: 'Papua Tengah', capital: 'Nabire', island: 'Papua', lat: -3.5, lng: 136.0, areaKm2: 61073, population: '1.4 Juta' },
  { id: 'PE', name: 'Papua Pegunungan', capital: 'Jayawijaya / Wamena', island: 'Papua', lat: -4.0, lng: 138.8, areaKm2: 51213, population: '1.4 Juta' },
  { id: 'PD', name: 'Papua Barat Daya', capital: 'Sorong', island: 'Papua', lat: -1.0, lng: 131.5, areaKm2: 39123, population: '0.6 Juta' },
];

// Province entries above are search centroids/reference metadata only.
// Do not use them as administrative boundary geometry.
