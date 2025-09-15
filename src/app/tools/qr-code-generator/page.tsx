
"use client";

import React, { useState, useRef, useCallback, useContext } from 'react';
import QRCode from 'qrcode';
import { saveAs } from 'file-saver';
import { Button } from '@/components/ui/button';
import { Download, Text, Link as LinkIcon, Wifi, Mail, MessageSquare, Phone, MapPin, LocateFixed, QrCode } from 'lucide-react';
import { LanguageContext } from '@/context/language-context';
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

type QrType = 'url' | 'text' | 'wifi' | 'email' | 'sms' | 'tel' | 'geo';
type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

const QrCodeGeneratorPage = () => {
    const { t } = useContext(LanguageContext);
    const { toast } = useToast();
    const [qrType, setQrType] = useState<QrType>('url');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [isDataValid, setIsDataValid] = useState(false);
    const [isDetectingLocation, setIsDetectingLocation] = useState(false);

    // Form state for different types
    const [text, setText] = useState('https://pdf-easy.com');
    const [wifi, setWifi] = useState({ ssid: '', password: '', encryption: 'WPA' });
    const [email, setEmail] = useState({ to: '', subject: '', body: '' });
    const [sms, setSms] = useState({ phone: '', message: '' });
    const [tel, setTel] = useState('');
    const [geo, setGeo] = useState({ latlon: '' });

    // Customization state
    const [size, setSize] = useState(400);
    const [fgColor, setFgColor] = useState('#000000');
    const [bgColor, setBgColor] = useState('#ffffff');
    const [errorCorrection, setErrorCorrection] = useState<ErrorCorrectionLevel>('M');

    const generateQrCode = useCallback(async () => {
        let dataToEncode = '';
        let valid = false;
        
        switch(qrType) {
            case 'url':
                 dataToEncode = text.startsWith('http') || text.startsWith('https') ? text : `http://${text}`;
                 valid = text.length > 0;
                 break;
            case 'text':
                 dataToEncode = text;
                 valid = text.length > 0;
                 break;
            case 'wifi':
                dataToEncode = `WIFI:T:${wifi.encryption};S:${wifi.ssid};P:${wifi.password};;`;
                valid = wifi.ssid.length > 0;
                break;
            case 'email':
                dataToEncode = `mailto:${email.to}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
                valid = email.to.length > 0 && email.to.includes('@');
                break;
            case 'sms':
                dataToEncode = `smsto:${sms.phone}:${sms.message}`;
                valid = sms.phone.length > 0;
                break;
            case 'tel':
                dataToEncode = `tel:${tel}`;
                valid = tel.length > 0;
                break;
            case 'geo':
                const [lat, lon] = geo.latlon.split(',').map(s => s.trim());
                dataToEncode = `geo:${lat},${lon}`;
                valid = !!(lat && lon && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lon)));
                break;
        }

        setIsDataValid(valid);

        if (!valid) {
            setQrCodeUrl('');
            return;
        }

        try {
            const url = await QRCode.toDataURL(dataToEncode, {
                errorCorrectionLevel: errorCorrection,
                type: 'image/png',
                width: size,
                margin: 1, 
                color: {
                    dark: fgColor,
                    light: bgColor,
                },
            });
            setQrCodeUrl(url);
        } catch (err) {
            console.error(err);
            setQrCodeUrl('');
        }
    }, [text, qrType, wifi, email, sms, tel, geo, size, fgColor, bgColor, errorCorrection]);
    
    React.useEffect(() => {
        generateQrCode();
    }, [generateQrCode]);

    const handleDownload = () => {
        if (qrCodeUrl && isDataValid) {
            saveAs(qrCodeUrl, 'qrcode.png');
        }
    };
    
    const qrTypes = [
        { value: 'url', label: t.qrCodeGenerator.types.url.title, icon: LinkIcon },
        { value: 'text', label: t.qrCodeGenerator.types.text.title, icon: Text },
        { value: 'wifi', label: t.qrCodeGenerator.types.wifi.title, icon: Wifi },
        { value: 'email', label: t.qrCodeGenerator.types.email.title, icon: Mail },
        { value: 'sms', label: t.qrCodeGenerator.types.sms.title, icon: MessageSquare },
        { value: 'tel', label: t.qrCodeGenerator.types.tel.title, icon: Phone },
        { value: 'geo', label: t.qrCodeGenerator.types.geo.title, icon: MapPin },
    ];
    
    const handleDetectLocation = () => {
        if (!navigator.geolocation) {
            toast({
                variant: 'destructive',
                title: t.qrCodeGenerator.errors.geolocationNotSupportedTitle,
                description: t.qrCodeGenerator.errors.geolocationNotSupportedDescription
            });
            return;
        }

        setIsDetectingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setGeo(g => ({ ...g, latlon: `${latitude}, ${longitude}` }));
                setIsDetectingLocation(false);
            },
            (error) => {
                toast({
                    variant: 'destructive',
                    title: t.qrCodeGenerator.errors.geolocationErrorTitle,
                    description: t.qrCodeGenerator.errors.geolocationErrorDescription,
                });
                setIsDetectingLocation(false);
            }
        );
    };

    const renderForm = () => {
        switch(qrType) {
            case 'url': return <div><Label htmlFor="url-input">{t.qrCodeGenerator.types.url.label}</Label><Input id="url-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="https://example.com" className="mt-1"/></div>;
            case 'text': return <div><Label htmlFor="text-input">{t.qrCodeGenerator.types.text.label}</Label><Textarea id="text-input" value={text} onChange={(e) => setText(e.target.value)} className="mt-1" rows={5}/></div>;
            case 'wifi': return <div className="space-y-4"><div><Label htmlFor="wifi-ssid">{t.qrCodeGenerator.types.wifi.ssid}</Label><Input id="wifi-ssid" value={wifi.ssid} onChange={(e) => setWifi(w => ({ ...w, ssid: e.target.value }))} className="mt-1"/></div><div><Label htmlFor="wifi-pass">{t.qrCodeGenerator.types.wifi.password}</Label><Input id="wifi-pass" type="password" value={wifi.password} onChange={(e) => setWifi(w => ({ ...w, password: e.target.value }))} className="mt-1"/></div><div><Label htmlFor="wifi-enc">{t.qrCodeGenerator.types.wifi.encryption}</Label><Select value={wifi.encryption} onValueChange={(v) => setWifi(w => ({ ...w, encryption: v }))}><SelectTrigger id="wifi-enc" className="mt-1"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="WPA">WPA/WPA2</SelectItem><SelectItem value="WEP">WEP</SelectItem><SelectItem value="nopass">{t.qrCodeGenerator.types.wifi.noEncryption}</SelectItem></SelectContent></Select></div></div>;
            case 'email': return <div className="space-y-4"><div><Label htmlFor="email-to">{t.qrCodeGenerator.types.email.to}</Label><Input id="email-to" type="email" value={email.to} onChange={e => setEmail(em => ({...em, to: e.target.value}))} className="mt-1"/></div><div><Label htmlFor="email-subj">{t.qrCodeGenerator.types.email.subject}</Label><Input id="email-subj" value={email.subject} onChange={e => setEmail(em => ({...em, subject: e.target.value}))} className="mt-1"/></div><div><Label htmlFor="email-body">{t.qrCodeGenerator.types.email.body}</Label><Textarea id="email-body" value={email.body} onChange={e => setEmail(em => ({...em, body: e.target.value}))} className="mt-1"/></div></div>;
            case 'sms': return <div className="space-y-4"><div><Label htmlFor="sms-phone">{t.qrCodeGenerator.types.sms.phone}</Label><Input id="sms-phone" type="tel" value={sms.phone} onChange={e => setSms(s => ({...s, phone: e.target.value}))} className="mt-1"/></div><div><Label htmlFor="sms-msg">{t.qrCodeGenerator.types.sms.message}</Label><Textarea id="sms-msg" value={sms.message} onChange={e => setSms(s => ({...s, message: e.target.value}))} className="mt-1"/></div></div>;
            case 'tel': return <div><Label htmlFor="tel-input">{t.qrCodeGenerator.types.tel.label}</Label><Input id="tel-input" type="tel" value={tel} onChange={(e) => setTel(e.target.value)} placeholder="+1234567890" className="mt-1"/></div>;
            case 'geo': return <div className="space-y-4">
                <div><Label htmlFor="geo-lat-lon">{t.qrCodeGenerator.types.geo.latlon}</Label><Input id="geo-lat-lon" value={geo.latlon} onChange={e => setGeo(g => ({...g, latlon: e.target.value}))} placeholder="40.7128, -74.0060" className="mt-1"/></div>
                <Button variant="outline" onClick={handleDetectLocation} disabled={isDetectingLocation} className="w-full">
                    <LocateFixed className="mr-2 h-4 w-4" />
                    {isDetectingLocation ? t.qrCodeGenerator.types.geo.detecting : t.qrCodeGenerator.types.geo.detectButton}
                </Button>
            </div>;
            default: return null;
        }
    }

    return (
        <div className="flex min-h-screen w-full flex-col">
            <Header />
            <div className="flex flex-1">
                 <aside className="w-[350px] flex-shrink-0 border-r bg-slate-50" style={{height: 'calc(100vh - 64px)'}}>
                    <ScrollArea className="h-full p-6">
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold border-b pb-4">{t.qrCodeGenerator.optionsTitle}</h2>
                            
                            <div className="space-y-2">
                                <Label>{t.qrCodeGenerator.typeLabel}</Label>
                                <Select value={qrType} onValueChange={(v) => { setText(''); setQrCodeUrl(''); setQrType(v as QrType); }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select QR Code type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {qrTypes.map(type => (
                                            <SelectItem key={type.value} value={type.value}>
                                                <div className="flex items-center gap-2">
                                                    <type.icon className="h-4 w-4" />
                                                    {type.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-4 border-t pt-4">
                                {renderForm()}
                            </div>

                             <div className="space-y-4 border-t pt-4">
                                <h3 className="text-lg font-semibold">{t.qrCodeGenerator.customization}</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="fgColor">{t.qrCodeGenerator.fgColor}</Label>
                                        <Input id="fgColor" type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="p-1 h-10"/>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="bgColor">{t.qrCodeGenerator.bgColor}</Label>
                                        <Input id="bgColor" type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="p-1 h-10"/>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="quality">{t.qrCodeGenerator.quality}</Label>
                                    <Select value={errorCorrection} onValueChange={(v) => setErrorCorrection(v as ErrorCorrectionLevel)}>
                                        <SelectTrigger id="quality"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="L">{t.qrCodeGenerator.qualities.L}</SelectItem>
                                            <SelectItem value="M">{t.qrCodeGenerator.qualities.M}</SelectItem>
                                            <SelectItem value="Q">{t.qrCodeGenerator.qualities.Q}</SelectItem>
                                            <SelectItem value="H">{t.qrCodeGenerator.qualities.H}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                </aside>
                <main className="flex-1 flex flex-col items-center justify-center p-8 bg-white">
                    <div className="w-full max-w-md h-full flex flex-col items-center justify-center">
                        <div className="w-full aspect-square border-dashed border-2 rounded-lg flex items-center justify-center p-4" style={{ borderColor: fgColor, backgroundColor: bgColor }}>
                             {qrCodeUrl && isDataValid ? (
                                <img src={qrCodeUrl} alt="Generated QR Code" className="w-full h-full object-contain" />
                            ) : (
                                <div className="text-center text-muted-foreground">
                                    <QrCode className="mx-auto h-16 w-16 mb-4" />
                                    <p>{t.qrCodeGenerator.noQrCode}</p>
                                </div>
                            )}
                        </div>
                        <Button onClick={handleDownload} disabled={!isDataValid} className="mt-8 w-full" size="lg">
                            <Download className="mr-2 h-5 w-5" />
                            {t.qrCodeGenerator.downloadButton}
                        </Button>
                    </div>
                </main>
            </div>
            <Footer />
        </div>
    );
};

export default QrCodeGeneratorPage;
