import { Address } from '@/domain/ssot';

interface AddressFormProps {
    billingAddress: Partial<Address>;
    setBillingAddress: (addr: Partial<Address>) => void;
    shippingAddress: Partial<Address>;
    setShippingAddress: (addr: Partial<Address>) => void;
    sameAsBilling: boolean;
    setSameAsBilling: (val: boolean) => void;
}

export function AddressForm({
    billingAddress,
    setBillingAddress,
    shippingAddress,
    setShippingAddress,
    sameAsBilling,
    setSameAsBilling
}: AddressFormProps) {
    return (
        <div className="sb-card-glass-light p-6">
            <h3 className="text-lg font-semibold mb-4">Direcciones</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section>
                    <h4 className="text-sm font-semibold mb-3">Facturación</h4>
                    <div className="grid grid-cols-1 gap-3">
                        <input
                            className="sb-input"
                            placeholder="Dirección"
                            value={billingAddress.street || ''}
                            onChange={(e) => setBillingAddress({ ...billingAddress, street: e.target.value })}
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                className="sb-input"
                                placeholder="Ciudad"
                                value={billingAddress.city || ''}
                                onChange={(e) => setBillingAddress({ ...billingAddress, city: e.target.value })}
                            />
                            <input
                                className="sb-input"
                                placeholder="CP"
                                value={billingAddress.postalCode || ''}
                                onChange={(e) => setBillingAddress({ ...billingAddress, postalCode: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                className="sb-input"
                                placeholder="Provincia"
                                value={billingAddress.province || ''}
                                onChange={(e) => setBillingAddress({ ...billingAddress, province: e.target.value })}
                            />
                            <input
                                className="sb-input"
                                placeholder="País"
                                value={billingAddress.country || ''}
                                onChange={(e) => setBillingAddress({ ...billingAddress, country: e.target.value })}
                            />
                        </div>
                    </div>
                </section>
                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold">Envío</h4>
                        <label className="inline-flex items-center gap-2 text-xs">
                            <input
                                type="checkbox"
                                checked={sameAsBilling}
                                onChange={(e) => setSameAsBilling(e.target.checked)}
                            />
                            Igual que facturación
                        </label>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        <input
                            className="sb-input"
                            placeholder="Dirección"
                            value={(sameAsBilling ? billingAddress.street : shippingAddress.street) || ''}
                            onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                            disabled={sameAsBilling}
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                className="sb-input"
                                placeholder="Ciudad"
                                value={(sameAsBilling ? billingAddress.city : shippingAddress.city) || ''}
                                onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                                disabled={sameAsBilling}
                            />
                            <input
                                className="sb-input"
                                placeholder="CP"
                                value={(sameAsBilling ? billingAddress.postalCode : shippingAddress.postalCode) || ''}
                                onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                                disabled={sameAsBilling}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                className="sb-input"
                                placeholder="Provincia"
                                value={(sameAsBilling ? billingAddress.province : shippingAddress.province) || ''}
                                onChange={(e) => setShippingAddress({ ...shippingAddress, province: e.target.value })}
                                disabled={sameAsBilling}
                            />
                            <input
                                className="sb-input"
                                placeholder="País"
                                value={(sameAsBilling ? billingAddress.country : shippingAddress.country) || ''}
                                onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                                disabled={sameAsBilling}
                            />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
