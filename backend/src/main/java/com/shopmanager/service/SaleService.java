package com.shopmanager.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.shopmanager.dto.common.PageResponse;
import com.shopmanager.dto.sale.SaleItemRequest;
import com.shopmanager.dto.sale.SaleRequest;
import com.shopmanager.dto.sale.SaleResponse;
import com.shopmanager.dto.sale.SaleSummaryResponse;
import com.shopmanager.entity.MovementType;
import com.shopmanager.entity.Product;
import com.shopmanager.entity.Sale;
import com.shopmanager.entity.SaleItem;
import com.shopmanager.entity.StockMovement;
import com.shopmanager.entity.Unit;
import com.shopmanager.entity.User;
import com.shopmanager.exception.InsufficientStockException;
import com.shopmanager.exception.ResourceNotFoundException;
import com.shopmanager.repository.ProductRepository;
import com.shopmanager.repository.SaleRepository;
import com.shopmanager.repository.StockMovementRepository;
import com.shopmanager.security.CurrentUserService;


@Service
public class SaleService {

    private static final Set<Unit> COUNT_UNITS =
            Set.of(Unit.PIECE, Unit.PACKET, Unit.BOX, Unit.BOTTLE);

    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;
    private final StockMovementRepository stockMovementRepository;
    private final CurrentUserService currentUserService;

    public SaleService(SaleRepository saleRepository, ProductRepository productRepository,
            StockMovementRepository stockMovementRepository,
            CurrentUserService currentUserService) {
        this.saleRepository = saleRepository;
        this.productRepository = productRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.currentUserService = currentUserService;
    }

    @Transactional
    public SaleResponse createSale(SaleRequest request) {
        User owner = currentUserService.currentUser();
        requireItems(request.items());
        Map<Long, Product> products = new HashMap<>();
        Map<Long, BigDecimal> soldQuantities = new LinkedHashMap<>();
        List<SaleItem> items = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;

        for (SaleItemRequest line : request.items()) {
            Product product = products.computeIfAbsent(line.productId(), this::findProduct);
            BigDecimal quantity = line.quantity();
            validateQuantity(product, quantity);
            soldQuantities.merge(product.getId(), quantity, BigDecimal::add);
            items.add(new SaleItem(product, quantity, product.getSellingPrice(),
                    product.getPurchasePrice(), product.getMrp()));
            total = total.add(money(product.getSellingPrice().multiply(quantity)));
        }

        assertStockAvailable(products, soldQuantities);

        Sale sale = saleRepository.save(new Sale(owner, items, total));

        for (Map.Entry<Long, BigDecimal> sold : soldQuantities.entrySet()) {
            Product product = products.get(sold.getKey());
            BigDecimal previous = product.getCurrentQuantity();
            BigDecimal updated = previous.subtract(sold.getValue());
            product.setCurrentQuantity(updated);
            stockMovementRepository.save(new StockMovement(product, MovementType.SALE,
                    previous, sold.getValue().negate(), updated,
                    "Sale #" + sale.getId()));
        }

        return SaleResponse.from(sale);
    }

    @Transactional(readOnly = true)
    public SaleResponse getSale(Long id) {
        return SaleResponse.from(findSale(id));
    }

    @Transactional(readOnly = true)
    public PageResponse<SaleSummaryResponse> listSales(Pageable pageable) {
        return PageResponse.from(saleRepository
                .findByOwner(currentUserService.currentUser(), pageable)
                .map(SaleSummaryResponse::from));
    }

    private void requireItems(List<SaleItemRequest> items) {
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("A sale must have at least one item");
        }
    }

    private void validateQuantity(Product product, BigDecimal quantity) {
        if (COUNT_UNITS.contains(product.getUnit())
                && quantity.stripTrailingZeros().scale() > 0) {
            throw new IllegalArgumentException("Quantity for '" + product.getName()
                    + "' must be a whole number ("
                    + product.getUnit().name().toLowerCase() + " items)");
        }
    }

    private void assertStockAvailable(Map<Long, Product> products,
            Map<Long, BigDecimal> soldQuantities) {
        for (Map.Entry<Long, BigDecimal> sold : soldQuantities.entrySet()) {
            Product product = products.get(sold.getKey());
            BigDecimal available = product.getCurrentQuantity();
            BigDecimal required = sold.getValue();
            if (available.compareTo(required) < 0) {
                throw new InsufficientStockException("INSUFFICIENT_STOCK",
                        "Not enough stock for " + product.getName() + " (available " + available
                                + ", required " + required + ")");
            }
        }
    }

    private BigDecimal money(BigDecimal amount) {
        return amount.setScale(2, RoundingMode.HALF_UP);
    }

    private Sale findSale(Long id) {
        return saleRepository.findByIdAndOwner(id, currentUserService.currentUser())
                .orElseThrow(() -> new ResourceNotFoundException("SALE_NOT_FOUND",
                        "Sale not found with id " + id));
    }

    private Product findProduct(Long id) {
        return productRepository.findByIdAndOwner(id, currentUserService.currentUser())
                .orElseThrow(() -> new ResourceNotFoundException("PRODUCT_NOT_FOUND",
                        "Product not found with id " + id));
    }
}