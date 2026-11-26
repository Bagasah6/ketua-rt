RT.data.annualSeasons=[
  {id:"ramadan",title:"Ramadan & Lebaran",icon:"🌙",startWeek:6,endWeek:11,peakWeek:10,desc:"Tarawih, takjil, THR petugas, mudik & halalbihalal."},
  {id:"agustusan",title:"Agustusan (HUT RI)",icon:"🇮🇩",startWeek:31,endWeek:34,peakWeek:33,desc:"Panitia 17-an, lomba warga, malam tirakatan & LPJ."},
  {id:"hujan",title:"Puncak Musim Hujan",icon:"🌧️",startWeek:44,endWeek:48,peakWeek:46,desc:"Siaga cuaca ekstrem, drainase, fogging & pompa darurat."}
];

RT.data.seasonalEvents=(function(){
  function mk(id,season,cat,title,involved,desc,choices,opts){
    opts=opts||{};
    const sDef=RT.data.annualSeasons.find(x=>x.id===season);
    return {
      id:id,
      season:season,
      peak:!!opts.peak,
      category:cat,
      title:title,
      priority:opts.peak?18:13,
      once:true,
      cond:{week:{min:opts.peak?sDef.peakWeek-1:sDef.startWeek,max:sDef.endWeek}},
      involved:involved,
      desc:desc,
      ignore:opts.ignore||{fx:{satisfaction:-2,trust:-2}},
      choices:choices
    };
  }
  return [
    // 1. Ramadan & Lebaran (Minggu 6–11 · 12 Event)
    mk("ramadan_01","ramadan","social","Tarawih Pertama & Parkir Motor",["pak_arman","pak_joko"],
      "Motor jamaah tarawih pertama membludak sampai menutup pagar rumah warga di gang.",
      [
        {id:"atur_parkir",label:"Atur lahan parkir bersama ronda",desc:"Siapkan area parkir sementara di ujung gang.",energy:6,fx:{money:-5e4,satisfaction:4,security:3},tags:{community:1,safety:1},result:"Parkir jadi rapi dan akses pagar rumah warga tetap lega."},
        {id:"imbau_jalan",label:"Imbau jamaah jalan kaki",desc:"Kirim imbauan santun di grup WA warga.",energy:2,fx:{trust:2,comfort:2},tags:{social:1},result:"Sebagian warga mulai jalan kaki ke musala, meski masih ada beberapa motor terparkir."}
      ]),
    mk("ramadan_02","ramadan","social","Volume Toa Tadarus Tengah Malam",["pak_budi","bu_lina"],
      "Warga lansia ingin tadarus semalaman, sementara pekerja dan orang tua bayi minta dikecilkan setelah jam 22.00.",
      [
        {id:"kompromi",label:"Atur jam speaker luar & dalam",desc:"Speaker luar sampai 22.00, lanjut speaker dalam.",energy:6,fx:{trust:5,comfort:4,satisfaction:3},tags:{social:2},result:"Kedua pihak sepakat. Tadarus tetap khusyuk dan warga pekerja bisa istirahat."},
        {id:"biarkan_penuh",label:"Biarkan tanpa batas waktu",desc:"Hormati tradisi penuh selama bulan Ramadan.",energy:1,fx:{comfort:-5,satisfaction:-3,trust:-2},tags:{lenient:1},result:"Beberapa keluarga muda mengeluh kurang tidur di pagi hari."}
      ]),
    mk("ramadan_03","ramadan","economy","War Takjil di Mulut Gang",["bu_sari","pak_joko"],
      "Pedagang takjil musiman bikin gang macet tiap jam 5 sore, tapi ibu-ibu senang karena praktis.",
      [
        {id:"tata_lapak",label:"Tata zona lapak satu sisi",desc:"Sediakan area khusus tanpa menghalangi jalur motor.",energy:5,fx:{money:-5e4,satisfaction:4,comfort:3},tags:{admin:1,social:1},result:"Lapak tertata rapi di satu sisi, jajan tetap ramai tanpa bikin macet total."},
        {id:"larang_mulut",label:"Larang jualan di mulut gang",desc:"Tertibkan akses keluar-masuk komplek.",energy:4,fx:{comfort:4,satisfaction:-4,trust:-2},tags:{strict:1},result:"Jalanan lancar, tapi beberapa warga dan pedagang kecewa."}
      ]),
    mk("ramadan_04","ramadan","security","Petasan Anak Sebelum Subuh",["pak_ujang","andi"],
      "Bocah komplek main petasan banting dekat rumah warga yang lagi sakit.",
      [
        {id:"tegur_ortu",label:"Temui anak & orang tuanya",desc:"Edukasi bahaya petasan dan minta pindah aktivitas.",energy:5,fx:{security:5,comfort:4,trust:2},tags:{safety:1,social:1},result:"Orang tua langsung menertibkan anak-anaknya. Suasana subuh kembali tenang."},
        {id:"teguran_grup",label:"Tegur keras di grup WA",desc:"Kirim peringatan umum agar tidak terulang.",energy:2,fx:{security:2,satisfaction:-2},tags:{strict:1},result:"Petasan berhenti sementara, walau ada orang tua yang merasa tersindir."}
      ]),
    mk("ramadan_05","ramadan","social","Ronda Sahur Terlalu Bersemangat",["raka","pak_hendra"],
      "Pemuda keliling bangunkan sahur pakai galon terlalu kencang jam 02.30 pagi, bikin warga lain kaget.",
      [
        {id:"geser_jam",label:"Sepakati jam 03.30 & rute",desc:"Ajak pemuda ronda sahur di jam yang pas.",energy:4,fx:{satisfaction:4,comfort:3,trust:2},tags:{social:1},result:"Pemuda tetap semangat keliling di jam 03.30 dengan volume yang pas."},
        {id:"hentikan_galon",label:"Minta hentikan ronda sahur",desc:"Cukup pakai alarm masing-masing rumah.",energy:2,fx:{comfort:3,satisfaction:-3},tags:{strict:1},result:"Gang lebih sepi, tapi anak muda komplek kehilangan keseruan Ramadan."}
      ]),
    mk("ramadan_06","ramadan","social","Konsep Bukber RT (Mewah vs Sederhana)",["bu_sari","pak_dedi"],
      "PKK dan Karang Taruna debat soal anggaran buka bersama warga.",
      [
        {id:"potluck_sederhana",label:"Bukber sederhana + potluck warga",desc:"Kas bantu takjil dasar, lauk dibawa sukarela.",energy:5,fx:{money:-15e4,trust:4,satisfaction:4},tags:{save:1,community:2},result:"Acara guyub dan kas tetap sehat menjelang Lebaran."},
        {id:"paket_katering",label:"Gunakan katering penuh dari kas",desc:"Biar praktis tanpa merepotkan warga.",energy:3,fx:{money:-45e4,satisfaction:5,reputation:2},tags:{spend:1},result:"Warga puas dengan hidangan, meski kas RT terpotong lumayan besar."}
      ]),
    mk("ramadan_07","ramadan","cleanliness","Sampah Takjil & Batok Kelapa",["bu_wati","pak_budi"],
      "Tong sampah komplek penuh 2x lebih cepat gara-gara sampah plastik bukber dan batok kelapa.",
      [
        {id:"angkut_ekstra",label:"Tambah jadwal angkut sementara",desc:"Bayar petugas angkut ekstra selama Ramadan.",energy:3,fx:{money:-15e4,cleanliness:6,comfort:4},tags:{spend:1,clean:2},result:"Tong sampah tidak lagi meluber dan bau sisa takjil hilang."},
        {id:"imbau_pilah",label:"Imbau warga pilah dari rumah",desc:"Minta plastik & organik dipisah sendiri.",energy:2,fx:{cleanliness:2,trust:1},tags:{save:1},result:"Sebagian warga patuh, meski tong masih agak penuh di akhir pekan."}
      ]),
    mk("ramadan_08","ramadan","finance","Tanya Kepastian THR Petugas",["pak_dedi","pak_ujang"],
      "Petugas keamanan dan kebersihan mulai menanyakan kepastian THR menjelang H-7.",
      [
        {id:"cairkan_kas",label:"Cairkan THR layak dari Kas RT",desc:"Berikan apresiasi penuh atas kerja setahun.",energy:4,fx:{money:-5e5,trust:6,satisfaction:4,security:3},tags:{spend:1,social:1},result:"Petugas sangat bersyukur dan makin semangat menjaga komplek saat mudik."},
        {id:"patungan_warga",label:"Buka iuran sukarela THR warga",desc:"Ajak warga urunan seikhlasnya tanpa beban kas.",energy:5,fx:{money:-1e5,trust:2,satisfaction:1},tags:{burden:1,save:1},result:"Dana terkumpul secukupnya. Petugas tetap berterima kasih."}
      ]),
    mk("ramadan_09","ramadan","security","Pemudik Pergi Tanpa Lapor",["pak_ujang","pak_arman"],
      "Beberapa rumah ditinggal mudik dalam keadaan kosong tanpa lapor ke pengurus RT.",
      [
        {id:"data_rumah",label:"Data ulang & patroli ekstra",desc:"Cek rumah kosong dan pasang jadwal ronda intensif.",energy:7,fx:{money:-1e5,security:7,trust:4},tags:{safety:2},result:"Rumah kosong terpantau aman hingga pemiliknya kembali."},
        {id:"pesan_grup",label:"Minta konfirmasi di grup WA",desc:"Imbau yang sudah di jalan untuk lapor kontak darurat.",energy:2,fx:{security:3,trust:1},tags:{admin:1},result:"Sebagian pemudik merespons dan menitipkan kunci cadangan ke tetangga."}
      ]),
    mk("ramadan_10","ramadan","social","Peliharaan Pemudik Ditinggal di Teras",["bu_maya","bu_wati"],
      "Warga mudik meninggalkan kucing di teras dengan pakan seadanya; tetangga komplain bau dan suara.",
      [
        {id:"titip_rawat",label:"Koordinasi tetangga & pakan darurat",desc:"Bantu pakan sementara dan hubungi pemiliknya.",energy:5,fx:{money:-5e4,cleanliness:3,comfort:3,trust:3},tags:{community:1},result:"Hewan terurus baik dan pemiliknya minta maaf sambil ganti biaya."},
        {id:"tegur_pemilik",label:"Tegur pemilik untuk cari penitipan",desc:"Minta kerabat pemilik segera mengambilnya.",energy:2,fx:{comfort:2,satisfaction:-1},tags:{strict:1},result:"Kerabat datang dua hari kemudian setelah sempat bikin tetangga sebal."}
      ]),
    mk("ramadan_11","ramadan","social","Malam Takbiran & Kembang Api",["raka","pak_budi"],
      "Pemuda minta izin main kembang api di ujung gang, sementara warga senior takut bahaya atap rumah.",
      [
        {id:"zona_aman",label:"Izinkan kembang api kecil di lapangan",desc:"Siapkan ember air dan batas waktu jam 22.30.",energy:6,fx:{money:-5e4,satisfaction:5,security:3,trust:3},tags:{safety:1,social:1},result:"Malam takbiran meriah tapi tetap aman dan terkendali."},
        {id:"larang_total",label:"Larang kembang api, fokus takbir",desc:"Utamakan keselamatan atap rumah warga.",energy:3,fx:{security:5,satisfaction:-3},tags:{strict:1},result:"Malam aman tanpa percikan api, meski pemuda agak kecewa."}
      ],{peak:true}),
    mk("ramadan_12","ramadan","social","Halalbihalal & Arus Balik Warga",["bu_rina","sinta"],
      "Warga yang baru balik mudik minta jadwal kumpul silaturahmi RT agar saling kenal.",
      [
        {id:"gelar_halal",label:"Gelar halalbihalal sederhana di balai/gang",desc:"Sajikan teh hangat dan kue lebaran bersama.",energy:6,fx:{money:-2e5,trust:6,satisfaction:5,reputation:3},tags:{community:2},result:"Suasana akrab pasca-Lebaran, warga baru pun langsung merasa diterima."},
        {id:"salam_grup",label:"Silaturahmi lewat grup & anjangsana kecil",desc:"Hemat kas dan biar warga beristirahat.",energy:2,fx:{trust:2,satisfaction:1},tags:{save:1},result:"Ucapan maaf memenuhi grup WA RT 04."}
      ]),

    // 2. Agustusan (Minggu 31–34 · 12 Event)
    mk("agustusan_01","agustusan","social","Panitia 17-an Susah Dicari",["pak_arman","dimas"],
      "Semua semangat kasih ide lomba di grup WA, tapi pas ditunjuk jadi panitia mendadak sibuk semua.",
      [
        {id:"bentuk_tim",label:"Turun langsung & bagi tugas ringan",desc:"Pimpin rapat singkat biar tiap blok kirim 1 wakil.",energy:7,fx:{trust:5,satisfaction:3,reputation:3},tags:{community:2},result:"Akhirnya terbentuk panitia inti yang solid dengan tugas jelas."},
        {id:"acara_mini",label:"Perkecil skala acara biar simpel",desc:"Cukup 3 lomba anak dan doa bersama.",energy:3,fx:{satisfaction:-2,comfort:2},tags:{save:1},result:"Persiapan lebih enteng, meski warga sempat berharap lebih meriah."}
      ]),
    mk("agustusan_02","agustusan","finance","Surat Edaran Donasi Ruko & Warga",["pak_dedi","pak_joko"],
      "Panitia minta stempel RT buat narik sumbangan ke ruko depan; sebagian pemilik ruko merasa keberatan.",
      [
        {id:"sukarela_jelas",label:"Tegaskan sifat sukarela + transparansi",desc:"Cantumkan rincian anggaran dan tanpa target nominal.",energy:4,fx:{trust:5,reputation:4},tags:{transparency:2},result:"Pemilik ruko menghargai keterbukaan RT dan ikut menyumbang seikhlasnya."},
        {id:"pakai_kas",label:"Tutup dari kas RT tanpa edaran ruko",desc:"Hindari kesan memaksa pemilik usaha sekitar.",energy:2,fx:{money:-25e4,reputation:3,satisfaction:2},tags:{spend:1},result:"Tidak ada keluhan dari ruko, meski kas RT berkurang."}
      ]),
    mk("agustusan_03","agustusan","social","Rumah Belum Pasang Bendera",["pak_ujang","pak_hendra"],
      "Sudah H-5, beberapa rumah belum pasang bendera; pengurus bingung mau tegur atau belikan.",
      [
        {id:"belikan_stok",label:"Sediakan bendera cadangan dari kas",desc:"Bagikan untuk rumah yang belum sempat beli.",energy:4,fx:{money:-1e5,satisfaction:4,reputation:3},tags:{spend:1,social:1},result:"Seluruh gang serentak merah putih tanpa bikin warga tersinggung."},
        {id:"imbau_sopan",label:"Ingatkan sopan di grup & japri",desc:"Ajak warga pasang sebelum tanggal 15.",energy:2,fx:{reputation:2,trust:1},tags:{admin:1},result:"Hampir semua rumah akhirnya memasang bendera tepat waktu."}
      ]),
    mk("agustusan_04","agustusan","infrastructure","Anggaran Cat Gapura & Umbul-Umbul",["raka","pak_dedi"],
      "Pemuda minta dana cat ulang gapura dan umbul-umbul baru, tapi kas RT lagi dijaga.",
      [
        {id:"cat_gotong",label:"Beli cat seperlunya & kerja bakti",desc:"Pakai umbul-umbul tahun lalu yang masih bagus.",energy:6,fx:{money:-15e4,cleanliness:4,comfort:4,trust:3},tags:{community:1,save:1},result:"Gapura kembali cerah berkat tenaga pemuda dengan biaya hemat."},
        {id:"tunda_cat",label:"Pakai dekorasi seadanya dulu",desc:"Fokuskan anggaran ke perbaikan fasilitas.",energy:2,fx:{satisfaction:-3,reputation:-1},tags:{save:1},result:"Kas aman, walau gerbang gang terlihat agak pudar."}
      ]),
    mk("agustusan_05","agustusan","social","Hadiah Lomba Ibu-Ibu Minta Upgrade",["bu_sari","bu_maya"],
      "Ibu-ibu PKK menolak hadiah sembako biasa, maunya perabotan dapur yang lebih wah.",
      [
        {id:"tambah_hadiah",label:"Alokasikan tambahan hadiah wajar",desc:"Tambahkan beberapa perabot dapur favorit ibu-ibu.",energy:3,fx:{money:-2e5,satisfaction:6,trust:2},tags:{spend:1,social:1},result:"Lomba ibu-ibu berlangsung heboh dan penuh tawa."},
        {id:"pertahankan",label:"Pertahankan paket sembako merata",desc:"Lebih bermanfaat untuk banyak peserta.",energy:3,fx:{trust:3,satisfaction:-2},tags:{save:1},result:"Sebagian ibu-ibu sempat menggerutu, tapi lomba tetap ramai."}
      ]),
    mk("agustusan_06","agustusan","social","Orang Tua Baper di Lomba Anak",["bu_wati","bu_lina"],
      "Ada orang tua protes keras soal wasit lomba balap karung anaknya yang kalah.",
      [
        {id:"tengahin_hadiah",label:"Tengahi & beri hadiah hiburan semua anak",desc:"Tegaskan semangat sportivitas dan kegembiraan anak.",energy:5,fx:{money:-5e4,trust:4,satisfaction:4},tags:{social:2},result:"Suasana mencair, anak-anak tetap senang bawa pulang bingkisan."},
        {id:"tegaskan_aturan",label:"Dukung penuh keputusan wasit",desc:"Aturan lomba harus konsisten.",energy:3,fx:{reputation:2,satisfaction:-3},tags:{strict:1},result:"Keputusan tetap sah, meski satu keluarga pulang lebih awal."}
      ]),
    mk("agustusan_07","agustusan","social","Izin Tutup Jalan Malam Puncak",["pak_arman","pak_joko"],
      "Panitia mau tutup gang setengah hari buat panggung tirakatan; pemilik mobil protes tidak bisa keluar.",
      [
        {id:"koordinasi_parkir",label:"Tutup mulai sore & titip parkir di ujung",desc:"Berikan jadwal jelas dan akses darurat tetap terbuka.",energy:7,fx:{money:-1e5,satisfaction:5,trust:4,comfort:2},tags:{community:1,safety:1},result:"Malam puncak sukses meriah dan pemilik mobil tetap bisa beraktivitas."},
        {id:"tanpa_tutup",label:"Gelar acara di halaman pos/balai tanpa tutup jalan",desc:"Jaga kelancaran lalu lintas gang.",energy:4,fx:{comfort:4,satisfaction:-3},tags:{strict:1},result:"Jalanan lancar, tapi tempat acara terasa agak sempit."}
      ],{peak:true}),
    mk("agustusan_08","agustusan","social","Sound System Dangdutan Kepanjangan",["pak_budi","dimas"],
      "Musik malam puncak masih kencang lewat jam 22.00, warga blok belakang komplain.",
      [
        {id:"turunkan_tepat",label:"Matikan musik keras tepat 22.00",desc:"Lanjut ngobrol santai tanpa sound besar.",energy:4,fx:{comfort:5,trust:4,satisfaction:2},tags:{safety:1},result:"Warga lansia dan anak-anak bisa tidur nyenyak setelah jam 10."},
        {id:"toleransi_sejam",label:"Beri toleransi sampai 23.00",desc:"Minta panitia kecilkan bass-nya saja.",energy:2,fx:{comfort:-4,satisfaction:1},tags:{lenient:1},result:"Blok belakang masih terganggu sampai larut malam."}
      ]),
    mk("agustusan_09","agustusan","finance","Konsumsi Tumpeng Kurang Saat Acara",["bu_sari","pak_dedi"],
      "Tamu malam tasyakuran membludak, panitia minta dana darurat kas malam itu juga.",
      [
        {id:"tambah_darurat",label:"Setujui dana konsumsi darurat",desc:"Pesan tambahan nasi kotak/snack dari warung sekitar.",energy:3,fx:{money:-2e5,satisfaction:5,reputation:3},tags:{spend:1},result:"Semua tamu tetap kebagian makan malam dan acara berakhir hangat."},
        {id:"bagi_porsi",label:"Bagikan porsi yang ada secara merata",desc:"Utamakan lansia dan anak-anak lebih dulu.",energy:3,fx:{satisfaction:-3,trust:1},tags:{save:1},result:"Beberapa tamu pulang dengan perut lapar, meski kas aman."}
      ]),
    mk("agustusan_10","agustusan","cleanliness","Lomba Kebersihan Antar-Blok",["bu_wati","bu_maya"],
      "Blok A dan Blok B saling sindir soal hasil penilaian; butuh Pak RT jadi juri netral.",
      [
        {id:"nilai_terbuka",label:"Buat rubrik nilai terbuka & keliling bareng",desc:"Ajak perwakilan kedua blok ikut menilai secara objektif.",energy:6,fx:{trust:5,cleanliness:5,reputation:3},tags:{transparency:2,clean:1},result:"Penilaian diterima lapang dada dan kedua blok sama-sama bersih."},
        {id:"seri_aman",label:"Tetapkan juara bersama demi kerukunan",desc:"Bagi hadiah secara adil untuk semua blok.",energy:3,fx:{money:-1e5,satisfaction:3,reputation:-1},tags:{lenient:1},result:"Tidak ada yang ribut, meski sebagian merasa kurang kompetitif."}
      ]),
    mk("agustusan_11","agustusan","cleanliness","Sampah Tali Rafia & Tepung Lomba",["pak_ujang","raka"],
      "Sehari setelah 17-an, jalanan gang lengket penuh sisa tepung, plastik, dan umbul-umbul kusut.",
      [
        {id:"bersih_bareng",label:"Kerja bakti beres-beres pagi hari",desc:"Ajak panitia dan warga sapu & semprot gang.",energy:6,fx:{money:-5e4,cleanliness:7,comfort:4},tags:{community:1,clean:2},result:"Gang kembali bersih mengilap sebelum jam makan siang."},
        {id:"serahkan_petugas",label:"Minta petugas kebersihan bereskan",desc:"Tambahkan upah lembur kebersihan.",energy:2,fx:{money:-15e4,cleanliness:5},tags:{spend:1,clean:1},result:"Petugas membersihkan seluruh gang dengan rapi."}
      ]),
    mk("agustusan_12","agustusan","administration","Selisih Nota LPJ Panitia 17-an",["pak_dedi","bu_maya"],
      "Laporan akhir panitia ada selisih kecil tanpa struk; warga kritis mulai nyinyir di grup WA.",
      [
        {id:"audit_transparan",label:"Cocokkan nota & publikasikan LPJ terbuka",desc:"Luruskan selisih bersama bendahara sebelum diumumkan.",energy:6,fx:{trust:6,reputation:5},tags:{transparency:2},result:"Warga puas melihat laporan rapi dan tudingan miring langsung reda."},
        {id:"tutup_diam",label:"Tutup selisih dari kas tanpa bahas panjang",desc:"Biar masalah cepat selesai.",energy:2,fx:{money:-5e4,trust:-4,reputation:-2},tags:{delay:1},result:"Beberapa warga tetap curiga karena tidak ada penjelasan terbuka."}
      ]),

    // 3. Puncak Musim Hujan (Minggu 44–48 · 12 Event)
    mk("hujan_01","hujan","cleanliness","Surat Siaga Cuaca Ekstrem",["pak_arman","bu_rina"],
      "Kelurahan kirim edaran potensi hujan lebat sepekan; putuskan langsung kerja bakti atau tunggu kondisi.",
      [
        {id:"kerja_bakti",label:"Kerja bakti kuras saluran akhir pekan ini",desc:"Bersihkan selokan dan cek titik rawan genangan.",energy:7,fx:{money:-5e4,cleanliness:6,security:4,trust:3},tags:{community:1,clean:2},result:"Saluran air lancar sebelum hujan deras turun."},
        {id:"siaga_wa",label:"Teruskan surat edaran di grup WA",desc:"Minta warga bersihkan depan rumah masing-masing.",energy:2,fx:{cleanliness:2,trust:1},tags:{admin:1},result:"Warga mulai waspada, meski saluran utama belum dikeruk."}
      ]),
    mk("hujan_02","hujan","social","Talang Air Tetangga Nyemprot ke Sebelah",["pak_hendra","bu_wati"],
      "Hujan deras bikin air talang satu rumah tumpah ke teras tetangga dan memicu cekcok.",
      [
        {id:"mediasi_talang",label:"Mediasi & bantu arahkan pipa talang",desc:"Temui kedua rumah untuk pasang sambungan pipa ke got.",energy:5,fx:{money:-5e4,trust:5,comfort:4},tags:{social:2},result:"Masalah teknis beres dan hubungan bertetangga kembali adem."},
        {id:"minta_selesai",label:"Minta mereka selesaikan secara kekeluargaan",desc:"Tidak perlu campur tangan pengurus terlalu jauh.",energy:1,fx:{satisfaction:-3,trust:-2},tags:{delay:1},result:"Cekcok masih berlanjut setiap kali hujan turun."}
      ]),
    mk("hujan_03","hujan","infrastructure","Atap Pos Ronda Rembes",["pak_ujang","pak_budi"],
      "Genteng pos ronda bocor pas hujan malam, petugas ronda enggan jaga kalau tidak ditambal.",
      [
        {id:"tambal_genteng",label:"Ganti genteng & pasang talang pos",desc:"Perbaiki permanen supaya tim ronda nyaman.",energy:4,fx:{money:-2e5,security:6,comfort:3},tags:{spend:1,safety:1},result:"Pos ronda kembali kering dan jadwal jaga malam berjalan penuh."},
        {id:"terpal_sementara",label:"Pasang terpal seadanya dulu",desc:"Solusi darurat sampai hujan reda.",energy:3,fx:{money:-5e4,security:2},tags:{save:1},result:"Cukup menahan rembesan ringan, tapi berisik saat angin kencang."}
      ]),
    mk("hujan_04","hujan","infrastructure","Lubang Gang Ketutup Genangan",["pak_joko","pak_ujang"],
      "Lubang di tikungan tertutup air hujan sehingga pengendara motor nyaris jatuh.",
      [
        {id:"cor_batu",label:"Tandai kerucut & tambal kerikil/semen",desc:"Pasang penanda langsung lalu tutup lubang.",energy:5,fx:{money:-15e4,security:5,comfort:5},tags:{spend:1,safety:2},result:"Pengendara aman melintas meski jalan tergenang."},
        {id:"tanda_kayu",label:"Pasang rambu kayu peringatan saja",desc:"Tunggu musim kering untuk pengecoran.",energy:2,fx:{comfort:-3,security:1},tags:{delay:1},result:"Masih ada motor yang terserempet lubang saat malam."}
      ]),
    mk("hujan_05","hujan","security","Dahan Pohon Miring Dekat Kabel",["pak_budi","raka"],
      "Angin kencang membuat dahan pohon menyentuh kabel listrik dan atap rumah warga.",
      [
        {id:"pangkas_aman",label:"Panggil tukang pangkas & lapor PLN",desc:"Potong dahan berisiko sebelum tumbang.",energy:5,fx:{money:-2e5,security:7,comfort:3},tags:{spend:1,safety:2},result:"Dahan terpangkas rapi, jaringan listrik komplek aman dari korsleting."},
        {id:"pangkas_sendiri",label:"Pangkas seadanya pakai galah",desc:"Hemat biaya tanpa panggil tukang.",energy:6,fx:{security:3,comfort:1},tags:{save:1},result:"Ujung ranting terpotong, tapi dahan besar masih agak miring."}
      ]),
    mk("hujan_06","hujan","cleanliness","Jentik Nyamuk & Gejala DBD",["bu_sari","bu_rina"],
      "Genangan di pot dan ban bekas membuat kasus demam mulai muncul; warga minta fogging cepat.",
      [
        {id:"psn_fogging",label:"Gerakan 3M serentak + jadwalkan fogging",desc:"Kerahkan kader Jumantik dan pengasapan komplek.",energy:6,fx:{money:-25e4,cleanliness:7,trust:5,satisfaction:4},tags:{spend:1,clean:2},result:"Lingkungan bebas jentik dan warga merasa sangat terlindungi."},
        {id:"imbau_abate",label:"Bagikan bubuk abate & imbau 3M",desc:"Fokus cegah jentik tanpa fogging dulu.",energy:3,fx:{money:-5e4,cleanliness:3,satisfaction:-2},tags:{save:1},result:"Warga tetap waswas karena nyamuk dewasa masih banyak."}
      ]),
    mk("hujan_07","hujan","cleanliness","Sampah Nyangkut di Pintu Air Gang",["bu_wati","pak_ujang"],
      "Hujan deras membawa plastik menyumbat gorong-gorong sehingga air mulai naik ke jalan.",
      [
        {id:"angkat_sampah",label:"Turun langsung angkat sumbatan bareng warga",desc:"Pakai cangkul dan sarung tangan sebelum air masuk rumah.",energy:8,fx:{cleanliness:7,security:4,trust:5},tags:{community:2,clean:2},result:"Gorong-gorong plong dan genangan surut dalam 20 menit."},
        {id:"tunggu_surut",label:"Tunggu hujan reda baru dibersihkan",desc:"Terlalu berisiko kerja saat hujan deras.",energy:1,fx:{cleanliness:-5,comfort:-5,trust:-3},tags:{delay:1},result:"Air sempat masuk ke beberapa halaman rumah warga."}
      ]),
    mk("hujan_08","hujan","social","Parkir Darurat di Gang Tinggi",["pak_hendra","pak_joko"],
      "Garasi blok rendah mulai kemasukan air, warga parkir mobil di bahu gang yang lebih tinggi.",
      [
        {id:"atur_bahu",label:"Atur parkir satu sisi & buka jalur darurat",desc:"Izinkan sementara selama status siaga genangan.",energy:4,fx:{trust:4,satisfaction:4,comfort:1},tags:{social:1},result:"Mobil warga aman dan ambulans/motor tetap bisa lewat."},
        {id:"larang_bahu",label:"Larang parkir bahu gang demi akses",desc:"Minta cari lahan parkir komersial luar komplek.",energy:2,fx:{comfort:2,satisfaction:-4,trust:-3},tags:{strict:1},result:"Pemilik mobil di blok rendah kecewa di saat darurat."}
      ]),
    mk("hujan_09","hujan","comfort","Jemuran & Seng Ringan Terbang",["bu_maya","andi"],
      "Angin kencang menerbangkan jemuran dan seng tetangga ke halaman rumah sebelah.",
      [
        {id:"bantu_rapikan",label:"Bantu evakuasi & cek atap warga rentan",desc:"Pastikan seng/kanopi terikat kuat sebelum badai susulan.",energy:5,fx:{money:-5e4,comfort:4,security:4,trust:3},tags:{community:1,safety:1},result:"Atap warga kembali aman dan tidak ada yang cedera."},
        {id:"ingatkan_grup",label:"Ingatkan warga amankan barang luar rumah",desc:"Kirim checklist singkat di grup WA.",energy:2,fx:{comfort:2,security:1},tags:{admin:1},result:"Warga segera memasukkan barang-barang ringan ke dalam rumah."}
      ]),
    mk("hujan_10","hujan","infrastructure","Sewa Pompa Air Darurat",["pak_dedi","pak_arman"],
      "Air mulai masuk teras blok rendah; putuskan sewa pompa sekarang atau tunggu surut.",
      [
        {id:"sewa_pompa",label:"Sewa pompa sedot & selang sekarang",desc:"Cepat surutkan air sebelum merusak perabot warga.",energy:6,fx:{money:-4e5,security:6,satisfaction:6,trust:5},tags:{spend:1,safety:2},result:"Pompa bekerja nonstop dan rumah blok rendah selamat dari banjir."},
        {id:"tunggu_alami",label:"Tunggu surut alami + karung pasir",desc:"Hemat kas besar untuk kebutuhan lain.",energy:5,fx:{money:-5e4,satisfaction:-5,comfort:-5,trust:-3},tags:{save:1,delay:1},result:"Air butuh berjam-jam untuk surut dan beberapa warga merugi."}
      ],{peak:true}),
    mk("hujan_11","hujan","infrastructure","Kotak Sambungan Listrik Kemasukan Air",["pak_ujang","pak_budi"],
      "Lampu jalan dan beberapa rumah sempat korslet saat hujan lebat malam hari.",
      [
        {id:"panggil_pln",label:"Matikan MCB & panggil teknisi/PLN",desc:"Pasang pelindung box tahan air setelah dicek.",energy:5,fx:{money:-2e5,security:8,comfort:3},tags:{spend:1,safety:2},result:"Box sambungan aman dan lampu gang menyala normal kembali."},
        {id:"tutup_plastik",label:"Bungkus plastik darurat dulu",desc:"Tunggu teknisi datang besok pagi.",energy:3,fx:{security:-3,comfort:-2},tags:{delay:1},result:"Lampu gang sempat padam semalaman."}
      ]),
    mk("hujan_12","hujan","cleanliness","Jalanan Licin Penuh Lumpur Pasca-Hujan",["bu_wati","dimas"],
      "Setelah air surut, gang licin berlumpur dan butuh pembersihan bareng sebelum ada yang terpeleset.",
      [
        {id:"semprot_lumpur",label:"Kerja bakti semprot & sikat jalan gang",desc:"Gunakan air bersih dan sapu lidi bersama warga.",energy:7,fx:{money:-5e4,cleanliness:7,security:4,comfort:5},tags:{community:2,clean:2},result:"Gang kembali kesat dan aman dilalui anak-anak maupun lansia."},
        {id:"biarkan_kering",label:"Biarkan kering matahari dulu",desc:"Debu/lumpur akan hilang sendiri.",energy:1,fx:{cleanliness:-4,comfort:-4},tags:{delay:1},result:"Dua hari kemudian jalanan berdebu tebal dan masih licin di tempat teduh."}
      ])
  ];
})();
RT.defineEvents(RT.data.seasonalEvents);
