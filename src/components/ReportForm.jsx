import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Textarea } from './ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Label } from './ui/label';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Leaflet location picker child component
function LocationPicker({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng);
    },
  });
  return null;
}

export default function ReportForm({ user, onSuccess }) {
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // ── Handlers ──────────────────────────────────────────────────────────────

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

    setIsSubmitting(true);

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
      if (onSuccess) onSuccess();

    } catch (err) {
      setSubmitError(err.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="bg-[#0a2716]/40 backdrop-blur-xl border border-green-800/30 text-slate-100 shadow-2xl overflow-hidden">
        <CardHeader className="flex flex-row items-center gap-3 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-950/40 text-green-400 border border-green-800/30 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <CardTitle className="text-lg font-bold text-slate-100 leading-none">Report Waste</CardTitle>
            <CardDescription className="text-xs text-slate-400 mt-0.5">Fill in the details below to submit a new report</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form id="report-waste-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Success banner */}
            {submitSuccess && (
              <div className="rounded-xl bg-green-950/40 border border-green-800/60 p-4 flex items-start gap-3 text-sm text-green-300">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  <strong>Report submitted!</strong> Your waste report has been logged as{' '}
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                    pending
                  </span>{' '}
                  and will be reviewed by our team shortly.
                </span>
              </div>
            )}

            {/* Error banner */}
            {submitError && (
              <div className="rounded-xl bg-rose-950/40 border border-rose-800/60 p-4 flex items-start gap-3 text-sm text-rose-300">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span>{submitError}</span>
              </div>
            )}

            {/* Description */}
            <motion.div whileHover={{ x: 2 }} className="space-y-1.5">
              <Label htmlFor="report-description" className="text-sm font-semibold text-slate-200">
                Description <span className="text-rose-500 text-xs">*</span>
              </Label>
              <Textarea
                id="report-description"
                name="description"
                rows={4}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (submitSuccess) setSubmitSuccess(false);
                  if (submitError) setSubmitError('');
                }}
                placeholder="Describe the waste issue — e.g. overflowing bin at Block C entrance, illegal dumping near car park..."
                className="bg-slate-950/50 border-slate-800 text-slate-100 placeholder-slate-500 focus-visible:ring-green-500 focus-visible:border-green-500 resize-none rounded-xl"
              />
            </motion.div>

            {/* Geolocation capture */}
            <motion.div whileHover={{ x: 2 }} className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-200">
                Location <span className="text-rose-500 text-xs">*</span>
              </Label>

              <Button
                id="capture-location-btn"
                type="button"
                variant="outline"
                onClick={handleCaptureLocation}
                disabled={geoStatus === 'loading' || geoStatus === 'success'}
                className={`w-full justify-center gap-2.5 rounded-xl border font-semibold shadow-sm transition focus-visible:ring-green-500 focus-visible:border-green-500
                  ${geoStatus === 'success'
                    ? 'bg-green-950/20 border-green-800 text-green-400 hover:bg-green-950/20 cursor-default'
                    : geoStatus === 'error'
                    ? 'bg-rose-950/20 border-rose-800 text-rose-400 hover:bg-rose-900/30 cursor-pointer'
                    : geoStatus === 'loading'
                    ? 'bg-slate-900/40 border-slate-800 text-slate-400 cursor-wait'
                    : 'bg-slate-950/40 border-slate-800 text-slate-200 hover:bg-slate-900/60 hover:text-white cursor-pointer'
                  }`}
              >
                {geoStatus === 'loading' && (
                  <>
                    <svg className="h-4 w-4 animate-spin text-green-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Acquiring GPS signal...
                  </>
                )}
                {geoStatus === 'success' && (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-green-500">
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
              </Button>

              {/* Coordinates readout */}
              {coords && (
                <p className="mt-2 text-xs text-slate-400 font-mono bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2">
                  📍 {coords.latitude.toFixed(6)},&nbsp;{coords.longitude.toFixed(6)}
                </p>
              )}

              {/* Geo error message */}
              {geoStatus === 'error' && geoError && (
                <p className="mt-2 text-xs text-rose-400 flex items-start gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 flex-shrink-0 mt-0.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {geoError}
                </p>
              )}

              {/* Manual map fallback */}
              <div className="mt-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-px bg-slate-850" />
                  <span className="text-xs text-slate-450 font-medium whitespace-nowrap">
                    or select location manually on the map
                  </span>
                  <div className="flex-1 h-px bg-slate-850" />
                </div>

                <div
                  className="rounded-xl overflow-hidden border border-slate-800 shadow-sm"
                  style={{ height: '250px' }}
                >
                  <MapContainer
                    center={[7.6212, 5.2215]}
                    zoom={14}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={false}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationPicker
                      onSelect={(latlng) => {
                        setCoords({ latitude: latlng.lat, longitude: latlng.lng });
                        setGeoStatus('success');
                        setGeoError('');
                        if (submitError) setSubmitError('');
                      }}
                    />
                    {coords && (
                      <Marker position={[coords.latitude, coords.longitude]} />
                    )}
                  </MapContainer>
                </div>
                <p className="mt-1.5 text-xs text-slate-450 text-center">
                  Tap anywhere on the map to drop a pin at that location
                </p>
              </div>
            </motion.div>

            {/* Image upload */}
            <motion.div whileHover={{ x: 2 }} className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-200">
                Photo{' '}
                <span className="text-slate-400 font-normal text-xs">(optional)</span>
              </Label>

              {!imagePreview ? (
                /* Drop zone */
                <label
                  htmlFor="image-upload"
                  className="flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-slate-800 bg-slate-950/40 hover:bg-slate-900/40 hover:border-green-800/40 transition-all cursor-pointer group"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-slate-600 group-hover:text-green-500/60 transition mb-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  <p className="text-sm text-slate-450 group-hover:text-slate-300 transition font-medium">
                    Click to upload a photo
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">JPG, PNG, WEBP — max 10 MB</p>
                  <Input
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
                <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-sm">
                  <img
                    src={imagePreview}
                    alt="Selected waste photo preview"
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-0 left-0 right-0 px-3 py-2.5 flex items-center justify-between">
                    <span className="text-white text-xs font-medium truncate max-w-[70%] drop-shadow">
                      {imageFile?.name}
                    </span>
                    <Button
                      id="remove-image-btn"
                      type="button"
                      variant="ghost"
                      onClick={handleRemoveImage}
                      className="h-7 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 px-2.5 py-1 text-xs text-white hover:bg-black/60 hover:text-white transition"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3 mr-1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Remove
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Submit */}
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full">
              <Button
                id="submit-report-btn"
                type="submit"
                disabled={isSubmitting}
                className="w-full justify-center items-center gap-2 rounded-xl bg-green-600 hover:bg-green-500 text-white shadow-[0_0_20px_rgba(22,163,74,0.3)] transition-all border border-green-400/50 px-4 py-3.5 text-sm font-semibold focus:outline-none focus-visible:ring-green-500 focus-visible:border-green-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
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
              </Button>
            </motion.div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
