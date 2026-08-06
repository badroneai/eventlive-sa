# EVENTME — سجل الحسابات الرسمية الموحّد (Social Accounts Registry)

**التاريخ:** 2026-07-19 | **الغرض:** وقود مسار التقاط الفعاليات من السوشال (المرحلة القادمة — يغذي T6.5 محرّك اكتشاف المصادر)
**المنهجية:** ثلاثة وكلاء بحث متوازيين. التحقق عبر (أ) نقطة X syndication المجانية `syndication.twitter.com/srv/timeline-profile/screen-name/<handle>` حيث أمكن، أو (ب) تثليث مصادر بالبحث (واس، سبق، المواقع الرسمية `.gov.sa`/`.edu.sa`) عند حظر الـ IP.

**درجات الثقة:**
- `API-verified` — مؤكد مباشرة عبر syndication (متابعون + توثيق)
- `confirmed` — مؤكد عبر صفحة x.com أو موقع الجهة الرسمي
- `search` — مؤكد بالبحث المتقاطع فقط، يحتاج فحص API لاحقًا
- `ambiguous` — حسابان متوازيان، يحتاج حسمًا يدويًا
- `not-found` — لا حساب رسمي، تُلتقط فعالياته من الجهة الأم

---

## الفئة الذهبية — أعلى قيمة، مؤكدة API، جاهزة للربط فورًا

| الحساب | الجهة | المتابعون | ملاحظة |
|---|---|---|---|
| @Enjoy_Saudi | عيشها (هيئة الترفيه) | 1.93M | **الأثمن** — واجهة "ماذا يحدث" الرسمية الوطنية |
| @GEA_SA | الهيئة العامة للترفيه | 2.56M | الجهة الأم لكل المواسم |
| @RiyadhSeason | موسم الرياض | 1.42M | أنشط حساب مواسم |
| @JEDCalendar | موسم جدة (تقويم جدة) | 299K | الحساب الرسمي الأساسي (وليس @JeddahSeason) |
| @DiriyahSeason | موسم الدرعية | 115K | |
| @AlUlaMoments | لحظات العلا | 119K | فعاليات العلا تحديدًا (شتاء طنطورة يمر عبره) |
| @Saudi_MT | وزارة السياحة | 821K | |
| @NEC_Saudi | المركز الوطني للفعاليات | 63K | جدولة الفعاليات الحكومية |
| @rcrcsa | الهيئة الملكية لمدينة الرياض | 394K | |
| @RCU_SA | الهيئة الملكية للعلا | 205K | |
| @qiddiya | القدية (عربي) + @qiddiya_en | 305K | |
| @NEOM | نيوم | 1.13M | |
| @VisitSaudi | روح السعودية | 100K | + IG @visitsaudi (624K) |
| @SaudiTourism | الهيئة السعودية للسياحة | 91K | |
| @TaifSeason | موسم الطائف | 82K | IG @taifseason |
| @asda_aseer | هيئة تطوير عسير | 43K | |
| @SoudahDevCo | السودة للتطوير | 34K | ⚠️ الاسم الداخلي ظهر `Soudahpeaks` — تأكد من الـ handle الحالي قبل الربط |
| @RedSeaGlobal | البحر الأحمر الدولية | 70K | |
| @DiriyahCo | شركة الدرعية | 24K | |
| @ExperienceAlUla | تجربة العلا | 104K | |

---

## المسار 1 — إمارات المناطق الـ13 (تحقق بالبحث المتقاطع)

| المنطقة | X | Instagram | الثقة | ملاحظات |
|---|---|---|---|---|
| القصيم | @EmarahAlQassim | @emarahalqassim | عالية | شارة التوثيق الحكومي الرمادية، 151K |
| مكة المكرمة | @makkahregion | — | عالية | 1M+ |
| المدينة المنورة | @imarat_almadina | — | عالية | |
| الشرقية | @emara_sharqia | — | عالية | مقال واس يؤكد الإطلاق، ~500K |
| عسير | @emartasir | — | عالية | مرتبط بـ aseer.gov.sa، ~242K |
| حائل | @emara_hail | — | عالية | 77K |
| الحدود الشمالية | @NorthborderSA | @northborder_sa | عالية | مقال واس يؤكد |
| جازان | @jazangov | — | عالية | |
| الجوف | @AljoufSA | — | عالية | يغطي "مهرجان خيرات الجوف" — قيمة مباشرة |
| تبوك | @TabukPrincipal | — | متوسطة-عالية | |
| نجران | @emara_najran | — | متوسطة-عالية | |
| الرياض | @emara_alriyadh أو @emara_riyadh | @emara_alriyadh | **ambiguous** | حسابان نشطان — فحص يدوي |
| الباحة | @BahaPrincedom أو @Emara_Albaha | — | **ambiguous** | حسابان متوازيان — فحص يدوي |

## المسار 2 — الأمانات وهيئات التطوير

| الجهة | X | Instagram | الثقة |
|---|---|---|---|
| **أمانة القصيم** | **@Qassimmun** | @qassimmun (+ سناب/يوتيوب بنفس الاسم) | **عالية — موثّقة عبر خبر رسمي على qassim.gov.sa** |
| أمانة جدة | @JeddahAmanah (+ @AmanahSupport) | — | عالية |
| أمانة العاصمة المقدسة | @holymakkah | @makkahmunicipality | عالية |
| أمانة المدينة | @AmanaAlmadinah | — | متوسطة-عالية |
| أمانة الرياض | @Amanatalriyadh | — | متوسطة |
| أمانة الشرقية | @EasternEamana | — | متوسطة |
| أمانة عسير | @asirmunicipal | — | متوسطة-عالية |
| أمانة حائل | @Amanat_Hail | — | متوسطة |
| أمانة تبوك | @tabukm | — | متوسطة |
| أمانة جازان | @jazansa | — | متوسطة |
| أمانة نجران | @NajranMunicipal | — | متوسطة-عالية |
| أمانة الباحة | @amantalbaha | — | متوسطة |
| أمانة الجوف | @amanataljouf | — | متوسطة |
| أمانة الحدود الشمالية | @amantalshmmalya | — | متوسطة (حالة الأحرف غير مؤكدة) |
| أمانة الطائف | @tc_gov أو @TaifcitySa | @tc_gov | **ambiguous** |
| هيئة تطوير المدينة | @MadinaAuthority | — | متوسطة |

## المسار 3 — الغرف التجارية

| الغرفة | X | Instagram | الثقة |
|---|---|---|---|
| **غرفة القصيم (بريدة)** | **@QassimChamber** | @qassimchamber | عالية |
| **غرفة عنيزة** | **@UCCI_Unaizah** | — | متوسطة-عالية |
| غرفة الرياض | @RiyadhChamber | @riyadhchamber | عالية |
| غرفة جدة | @JeddahChamber (+ @Jcci_Care) | — | عالية |
| غرفة الشرقية | @AsharqiaChamber | @asharqiachamber | عالية |
| غرفة مكة | @MakkahChamber | @makkahchamber | عالية |
| غرفة المدينة | @madinahchamber | — | متوسطة-عالية |
| غرفة أبها (عسير) | @abhachamber | @abhachamber | عالية |
| غرفة حائل | @hailchamber | @hail.chamber | عالية |
| غرفة تبوك | @tabukchamber | @tabukchamber | عالية |
| غرفة جازان | @JAZANCCI | (linktr.ee يؤكد المنصات) | عالية |
| غرفة نجران | @najrancci | — | عالية (خبر سبق يؤكد) |
| غرفة الباحة | @BahaChamber | — | متوسطة-عالية |
| غرفة الطائف | @taifcci | @taifcci | عالية |
| اتحاد الغرف السعودية | @CSC_SA أو @FSC_KSA | @fscsocial | **ambiguous** |

## المسار 4 — الجامعات وجهات التدريب (43/46 مؤكد)

### الجامعات الحكومية (27)

| الجهة | المدينة | X | حالة X | Instagram | حالة IG | فعاليات؟ |
|---|---|---|---|---|---|---|
| جامعة الملك سعود / KSU | الرياض | @_KSU | confirmed | @king_saud_university | confirmed | نعم |
| جامعة الملك عبدالعزيز / KAU | جدة | @kauedu_sa | confirmed | @kauedu_sa | confirmed | نعم |
| جامعة الملك فهد للبترول والمعادن / KFUPM | الظهران | @KFUPM | confirmed | @kfupm | noted | نعم |
| جامعة الإمام محمد بن سعود / IMSIU | الرياض | @IMSIU_edu_sa | confirmed | @imamu_edu_sa | noted | نعم |
| جامعة الملك خالد / KKU | أبها | @kkueduksa | confirmed | @insta_kku | confirmed | نعم |
| **جامعة القصيم / Qassim University** | **بريدة** | **@QassimUniv1** | confirmed | @qu_uni | confirmed | **نعم** |
| جامعة أم القرى / UQU | مكة | @uqu_edu | confirmed | @uqu_edu | unconfirmed | نعم |
| جامعة الملك فيصل / KFU | الأحساء | @KFUniversity | confirmed | @kfuniversity | confirmed | نعم |
| جامعة الأميرة نورة / PNU | الرياض | @_PNU_KSA | confirmed | @_PNU_KSA | confirmed | نعم |
| جامعة طيبة / Taibah | المدينة | @taibahu | confirmed | @taibah_uni | noted | نعم |
| جامعة الطائف / Taif University | الطائف | @TaifUniversity | confirmed | @taifuniv | confirmed | نعم |
| جامعة حائل / UOH | حائل | @_UOH | confirmed | @uohedu_sa | unconfirmed | نعم |
| جامعة تبوك / UT | تبوك | @U_Tabuk | confirmed | @u_tabuk | confirmed | نعم |
| جامعة جازان / Jazan University | جازان | @JazanUniversity | confirmed | @jazan.university | noted | نعم |
| جامعة نجران / Najran University | نجران | @Najran_Univers | confirmed | @Najran_Univers | confirmed | نعم |
| جامعة الباحة / Al-Baha University | الباحة | @BahaUniversity | confirmed | @bahauniversity | noted | نعم |
| جامعة الحدود الشمالية / NBU | عرعر | @NBU_KSA | confirmed | @nbu_ksa | confirmed | نعم |
| الجامعة الإسلامية بالمدينة | المدينة | @iu_edu | confirmed | @iu_edu_sa | confirmed | غير معروف |
| جامعة شقراء / Shaqra | شقراء | @ShaqraUni | confirmed | @shaqra_uni | noted | غير معروف |
| جامعة المجمعة / Majmaah | المجمعة | @umajmaah | confirmed | @majmaah__university | unconfirmed | غير معروف |
| جامعة الأمير سطام / PSAU | الخرج | @psau_edu_sa | confirmed | @psau_edu_sa | confirmed | غير معروف |
| جامعة الجوف / Jouf University | سكاكا | @JoufUniversity | confirmed | @joufuniversity | noted | غير معروف |
| جامعة بيشة / University of Bisha | بيشة | @Bisha_U | confirmed | @bisha_u | confirmed | غير معروف |
| الجامعة السعودية الإلكترونية / SEU | الرياض | @Saudi_EUni | confirmed | @seu_group | confirmed | غير معروف |
| جامعة الملك عبدالله / KAUST | ثول | @KAUST_News | confirmed | @kaustofficial | noted | غير معروف |
| جامعة جدة / University of Jeddah | جدة | @UOfjeddah | confirmed | @ujeddah | confirmed | غير معروف |
| جامعة حفر الباطن / UHB | حفر الباطن | @UHB_University | confirmed | @uhb.official | unconfirmed | غير معروف |

### الجامعات الأهلية (8)

| الجهة | المدينة | X | Instagram |
|---|---|---|---|
| جامعة الفيصل / Alfaisal | الرياض | @Alfaisaluniv | @alfaisaluniversity |
| جامعة عفت / Effat | جدة | @EffatUniversity | @effat_university |
| جامعة دار الحكمة / Dar Al-Hekma | جدة | @DAHUniversity | @dah_university |
| جامعة الأمير سلطان / PSU | الرياض | @PSU_RUH | @psu_ruh |
| **جامعة سليمان الراجحي / SRU** | **البكيرية، القصيم** | **@sredusa** | @sredusa |
| جامعة اليمامة / Yamamah | الرياض | @AlYamamah_Uni | @alyamamah_university |
| جامعة دار العلوم / DAU | الرياض | @dau_university | @dau.university |
| كلية البترجي الطبية / BMC | جدة | @bmcjed | @bmcjed |

(كل حسابات X أعلاه بحالة confirmed)

### جهات التدريب الوطنية (11)

| الجهة | X | Instagram | فعاليات؟ |
|---|---|---|---|
| معهد الإدارة العامة / IPA | @IPAConnect | @ipaconnect | نعم |
| أكاديمية طويق | @TuwaiqAcademy | @tuwaiqacademy | نعم |
| التدريب التقني والمهني / TVTC | @tvtcweb | @tvtc_web | نعم |
| مجمع الملك سلمان للغة العربية | @KSGAFAL | @ksgafal | غير معروف |
| مؤسسة مسك | @MiskKSA | @MISKKSA | نعم |
| سدايا (تشمل الأكاديمية) | @SDAIA_SA | @sdaia.saudi | نعم |
| دروب | not-found — تمر عبر @HRDFKSA | — | — |
| هدف / HRDF | @HRDFKSA | @hrdfksa | نعم |
| المركز الوطني للتعليم الإلكتروني | @NELC_SA | @nelc_sa | غير معروف |
| الأكاديمية السعودية الرقمية | @SdaAcademy | @sdaacademy_sa | نعم |
| أكاديمية مطوري آبل | @ADA_TWQ | @ada_twq | نعم |

⚠️ **حسابات مضللة مكتشفة — لا تُستخدم أبدًا:** @tuwaiq و @misk_sa (حسابات شخصية)، @MiskFoundation (قشرة ميتة)، @KSU_NEWS (ليس الرسمي)، @KAUST المجرد (حساب مقلّد)، @imamu_edu_sa و @UoHB_Official على X (404).

## المسار 5 — المهرجانات (تحقق جزئي)

| المهرجان | المنطقة | X | الحالة |
|---|---|---|---|
| مهرجان بريدة للتمور | القصيم | @Burayda_carnivl | search — يحتاج تأكيد API |
| مهرجان الملك عبدالعزيز للإبل | الرياض | @alaibilfestival (والأوثق: @CamelClub الجهة الأم) | search |
| MDLBEAST / Soundstorm | الرياض | @MDLBEAST | search |
| مهرجان البحر الأحمر السينمائي | جدة | @RedSeaFilm | search |
| معرض الرياض للكتاب | الرياض | @RyBookFair | search (موثق منذ 2011) |
| الجنادرية | الرياض | @AlJanadriaFest | search |
| مهرجان العسل بالباحة | الباحة | @ALBahaHoney | search — قد يكون حساب الجمعية لا المهرجان |
| شتاء طنطورة | العلا | لا حساب مستقل — عبر @AlUlaMoments | — |
| سوق عكاظ | الطائف | **not-found** — عبر وزارة الثقافة/موسم الطائف | — |
| معرض جدة للكتاب | جدة | **not-found** — عبر هيئة الأدب | — |
| مهرجان ورد الطائف | الطائف | **not-found** — عبر وزارة الثقافة | — |
| مهرجان البكيرية للفراولة | القصيم | **not-found** — عبر أمانة القصيم | — |
| موسم الباحة | الباحة | **not-found** — عبر أمانة الباحة | — |
| موسم قصيم/بريدة | القصيم | **لا يوجد** — لا موسم بعلامة مستقلة | — |

---

## تركيز القصيم (أولوية المالك)

أقوى منطقة توثيقًا في السجل — 6 حسابات متقاطعة المصادر:
1. إمارة القصيم @EmarahAlQassim (شارة حكومية رمادية)
2. أمانة القصيم @Qassimmun (**موثقة عبر خبر رسمي على qassim.gov.sa** — أقوى دليل في السجل كله)
3. غرفة القصيم @QassimChamber
4. غرفة عنيزة @UCCI_Unaizah
5. جامعة القصيم @QassimUniv1
6. جامعة سليمان الراجحي (البكيرية) @sredusa
+ مهرجان بريدة للتمور @Burayda_carnivl (يحتاج تأكيدًا)

**استنتاج استراتيجي:** لا يوجد "موسم قصيم" ولا حسابات مهرجانات مستقلة — فعاليات القصيم تُلتقط من الجهات المؤسسية أعلاه، وقيمة المنطقة الدائمة تأتي من بروفايل المدن (انظر `EVENTME-CITY-PROFILES-BRIEF.md`).

## أعمال المتابعة قبل الربط بالإنتاج

1. **حسم الحالات الغامضة الأربع** (فحص يدوي بالمتصفح): إمارة الرياض، إمارة الباحة، أمانة الطائف، اتحاد الغرف.
2. **إعادة فحص API** لحسابات `search` (~13 مهرجان/جهة) من IP غير مركز بيانات — نقطة syndication ترفض IP السحابة (429) لكنها تعمل من IP عادي.
3. **حسم @SoudahDevCo vs @Soudahpeaks** (يبدو أن الحساب غيّر معرّفه).
4. **التحقق من نشاط @saudiseasons** المظلي (حقيقي لكن بلا تغريدات حديثة في العينة).
5. حسابات Instagram غير المؤكدة تُعامل كترشيحات حتى الفحص.
