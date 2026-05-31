import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ReportHistory from '../components/ReportHistory';

/**
 * Primary view for residents.
 * Props:
 *   user    — Supabase auth user object
 *   profile — row from the profiles table ({ id, full_name, role, ... })
 */
export default function ResidentDashboard({ user, profile }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // ── Form state ────────────────────────────────────────────────────────────
  const [description, setDescription] = useState('');
  const [coords, setCoords] = useState(null); // { latitude, longitude }
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // ── Geolocation status: 'idle' | 'loading' | 'success' | 'error' ─────────
  const [geoStatus, setGeoStatus] = useState('idle');
  const [geoError, setGeoError] = useState('');

  // ── Submission state ──────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // ── Triggers ReportHistory to re-fetch after a successful submission ──────
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setGeoStatus('loading');
    setGeoError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setGeoStatus('success');
      },
      (err) => {
        setGeoStatus('error');
        setGeoError(
          err.code === 1
            ? 'Location access denied. Please allow location in your browser settings.'
            : 'Unable to retrieve your location. Please try again.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const resetForm = () => {
    setDescription('');
    setCoords(null);
    setGeoStatus('idle');
    setGeoError('');
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess(false);

    // ── Client-side validation ───────────────────────────────────────────────
    if (!description.trim()) {
      setSubmitError('Please enter a description of the waste issue.');
      return;
    }
    if (!coords) {
      setSubmitError('Location is required. Please capture your coordinates before submitting.');
      return;
    }

    setSubmitting(true);

    try {
      let imageUrl = null;

      // ── 1. Upload image if one was selected ────────────────────────────────
      if (imageFile) {
        const ext = imageFile.name.split('.').pop();
        const storagePath = `reports/${user.id}/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('waste-images')
          .upload(storagePath, imageFile, { cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('waste-images')
          .getPublicUrl(storagePath);

        imageUrl = urlData.publicUrl;
      }

      // ── 2. Insert waste report row ─────────────────────────────────────────
      const { error: insertError } = await supabase.from('waste_reports').insert({
        reporter_id: user.id,
        description: description.trim(),
        latitude: coords.latitude,
        longitude: coords.longitude,
        image_url: imageUrl,   // null if no image was uploaded
        status: 'pending',
      });

      if (insertError) throw insertError;

      // ── 3. Success ─────────────────────────────────────────────────────────
      setSubmitSuccess(true);
      resetForm();
      setRefreshTrigger((n) => n + 1); // triggers ReportHistory re-fetch

    } catch (err) {
      setSubmitError(err.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-green-50 via-slate-50 to-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-6">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <header className="glass rounded-2xl p-5 shadow-md border border-white/40 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-none m-0">SmartWaste</h1>
              <span className="text-xs text-slate-500 font-semibold tracking-wide uppercase">Resident Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-green-200 bg-green-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-green-800">
              Resident
            </span>
            <button
              id="sign-out-btn"
              onClick={handleSignOut}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:shadow focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              Sign Out
            </button>
          </div>
        </header>

        {/* ── Welcome banner ────────────────────────────────────────────── */}
        <section className="glass rounded-2xl px-6 py-5 border border-white/40 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Welcome back</p>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            {profile?.full_name || 'Resident'} 👋
          </h2>
          <p className="text-secondary text-sm mt-1">
            Help keep your community clean. Report a waste issue below and track your submissions.
          </p>
        </section>

        {/* ── Report Form ───────────────────────────────────────────────── */}
        <section className="glass rounded-2xl p-6 shadow-md border border-white/40">
          {/* Form heading */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 leading-none">Report Waste</h3>
              <p className="text-xs text-secondary mt-0.5">Fill in the details below to submit a new report</p>
            </div>
          </div>

          <form id="report-waste-form" onSubmit={handleSubmit} className="space-y-5">

            {/* Success banner */}
            {submitSuccess && (
              <div className="rounded-xl bg-green-50 border border-green-200 p-4 flex items-start gap-3 text-sm text-green-800">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  <strong>Report submitted!</strong> Your waste report has been logged as{' '}
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" />
                    pending
                  </span>{' '}
                  and will be reviewed by our team shortly.
                </span>
              </div>
            )}

            {/* Error banner */}
            {submitError && (
              <div className="rounded-xl bg-alert-light border border-alert/20 p-4 flex items-start gap-3 text-sm text-alert">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span>{submitError}</span>
              </div>
            )}

            {/* Description */}
            <div>
              <label htmlFor="report-description" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Description <span className="text-alert text-xs">*</span>
              </label>
              <textarea
                id="report-description"
                name="description"
                rows={4}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  // Clear feedback when user starts editing
                  if (submitSuccess) setSubmitSuccess(false);
                  if (submitError) setSubmitError('');
                }}
                placeholder="Describe the waste issue — e.g. overflowing bin at Block C entrance, illegal dumping near car park..."
                className="block w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-800 placeholder-slate-400 shadow-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>

            {/* Geolocation capture */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Location <span className="text-alert text-xs">*</span>
              </label>

              <button
                id="capture-location-btn"
                type="button"
                onClick={handleCaptureLocation}
                disabled={geoStatus === 'loading' || geoStatus === 'success'}
                className={`inline-flex w-full items-center justify-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary/20
                  ${geoStatus === 'success'
                    ? 'bg-green-50 border-green-200 text-green-700 cursor-default'
                    : geoStatus === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 cursor-pointer'
                    : geoStatus === 'loading'
                    ? 'bg-slate-50 border-slate-200 text-slate-500 cursor-wait'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-primary/50 cursor-pointer'
                  }`}
              >
                {geoStatus === 'loading' && (
                  <>
                    <svg className="h-4 w-4 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Acquiring GPS signal...
                  </>
                )}
                {geoStatus === 'success' && (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-green-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Location Captured
                  </>
                )}
                {(geoStatus === 'idle' || geoStatus === 'error') && (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    {geoStatus === 'error' ? 'Retry Location Capture' : 'Capture My Location'}
                  </>
                )}
              </button>

              {/* Coordinates readout */}
              {coords && geoStatus === 'success' && (
                <p className="mt-2 text-xs text-secondary font-mono bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                  📍 {coords.latitude.toFixed(6)},&nbsp;{coords.longitude.toFixed(6)}
                </p>
              )}

              {/* Geo error message */}
              {geoStatus === 'error' && geoError && (
                <p className="mt-2 text-xs text-alert flex items-start gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 flex-shrink-0 mt-0.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {geoError}
                </p>
              )}
            </div>

            {/* Image upload */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Photo{' '}
                <span className="text-slate-400 font-normal text-xs">(optional)</span>
              </label>

              {!imagePreview ? (
                /* Drop zone */
                <label
                  htmlFor="image-upload"
                  className="flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-slate-200 bg-white/40 hover:bg-white/70 hover:border-primary/40 transition-all cursor-pointer group"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-slate-300 group-hover:text-primary/60 transition mb-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  <p className="text-sm text-slate-400 group-hover:text-slate-600 transition font-medium">
                    Click to upload a photo
                  </p>
                  <p className="text-xs text-slate-300 mt-0.5">JPG, PNG, WEBP — max 10 MB</p>
                  <input
                    id="image-upload"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleImageChange}
                  />
                </label>
              ) : (
                /* Preview */
                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                  <img
                    src={imagePreview}
                    alt="Selected waste photo preview"
                    className="w-full h-48 object-cover"
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                  {/* Footer row */}
                  <div className="absolute bottom-0 left-0 right-0 px-3 py-2.5 flex items-center justify-between">
                    <span className="text-white text-xs font-medium truncate max-w-[70%] drop-shadow">
                      {imageFile?.name}
                    </span>
                    <button
                      id="remove-image-btn"
                      type="button"
                      onClick={handleRemoveImage}
                      className="flex items-center gap-1 rounded-lg bg-black/30 backdrop-blur-sm border border-white/20 px-2.5 py-1 text-xs text-white hover:bg-black/50 transition"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              id="submit-report-btn"
              type="submit"
              disabled={submitting}
              className="flex w-full justify-center items-center gap-2 rounded-xl bg-primary hover:bg-primary-hover px-4 py-3.5 text-sm font-semibold text-white shadow-md shadow-primary/20 hover:shadow-lg transition focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Submitting Report...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                  Submit Report
                </>
              )}
            </button>
          </form>
        </section>

        {/* ── Report History ────────────────────────────────────────────── */}
        <ReportHistory userId={user.id} refreshTrigger={refreshTrigger} />

      </div>
    </div>
  );
}
